"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useToastStore } from "@/store/useToastStore";
import { useHistoryStore } from "@/store/useHistoryStore";
import { useUserStore } from "@/store/useUserStore";
import { getStreamSrc, apiClient } from "@/lib/api-client";
import type { Song } from "@/types";

const DIRECT_URL_CACHE_TTL_MS = 12 * 60 * 1000;
const DIRECT_URL_TIMEOUT_MS = 8000;

interface CachedDirectUrl {
  url: string;
  br: number;
  expiry: number;
}

const directUrlCache = new Map<string, CachedDirectUrl>();
const inFlightDirectRequests = new Map<string, Promise<CachedDirectUrl | null>>();

function getPreferredBitrates(audioQuality?: string): number[] {
  if (audioQuality === "lossless") return [999, 320];
  if (audioQuality === "standard") return [192, 320];
  // 默认优先 320k MP3 (体积约 8-12MB，加载快且全端兼容)，若不可用自动尝试无损 999
  return [320, 999];
}

function isLikelyFullTrack(
  data: { url?: string; size?: number; br?: number },
  expectedDuration?: number
): boolean {
  if (!data?.url || typeof data.url !== "string" || !data.url.startsWith("http")) {
    return false;
  }

  const size = typeof data.size === "number" ? data.size : Number(data.size);
  const br = typeof data.br === "number" ? data.br : Number(data.br);

  if (Number.isFinite(size) && size > 0) {
    // 对于常规时长歌曲 (>60s)，小于 1MB 几乎必然是 15s/30s VIP 试听片段
    if ((!expectedDuration || expectedDuration > 60) && size <= 1_000_000) {
      return false;
    }

    // 按码率推算实际音频时长，排除 320k (~1.2MB) 或 FLAC (~3.4MB) 的 30s 试听片段
    if (Number.isFinite(br) && br > 0) {
      const estimatedSeconds = (size * 8) / (br * 1000);
      if (expectedDuration && expectedDuration > 75) {
        if (estimatedSeconds < Math.min(50, expectedDuration * 0.45)) {
          return false;
        }
      } else if (expectedDuration && expectedDuration > 0) {
        if (estimatedSeconds < expectedDuration * 0.45) {
          return false;
        }
      } else if (estimatedSeconds < 45) {
        return false;
      }
    }
  }

  return true;
}

function isLikelyLocalSong(song: Song): boolean {
  const cover = song.album?.coverPath;
  return song.id < 10000 && (!cover || !cover.startsWith("http"));
}

async function fetchGDStudioDirectUrl(
  songId: number,
  expectedDuration?: number,
  bitrates: number[] = [320, 999],
  externalSignal?: AbortSignal
): Promise<CachedDirectUrl | null> {
  const cacheKey = `${songId}:${bitrates[0]}`;
  const cached = directUrlCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached;
  }

  const existing = inFlightDirectRequests.get(cacheKey);
  if (existing) {
    return existing;
  }

  const promise = (async (): Promise<CachedDirectUrl | null> => {
    // 1. 优先走同源 /api/direct-audio 代理（由服务端解析网易云完整音轨直链 *.music.126.net，中国境内无需 VPN）
    if (!externalSignal?.aborted) {
      const proxyController = new AbortController();
      const onProxyAbort = () => proxyController.abort();
      externalSignal?.addEventListener("abort", onProxyAbort, { once: true });
      const proxyTimeout = setTimeout(() => proxyController.abort(), DIRECT_URL_TIMEOUT_MS);

      try {
        const params = new URLSearchParams({
          id: String(songId),
          br: String(bitrates[0]),
        });
        if (expectedDuration && expectedDuration > 0) {
          params.set("duration", String(Math.round(expectedDuration)));
        }
        const proxyRes = await fetch(`/api/direct-audio?${params.toString()}`, {
          signal: proxyController.signal,
        });
        clearTimeout(proxyTimeout);
        externalSignal?.removeEventListener("abort", onProxyAbort);

        if (proxyRes.ok) {
          const proxyData = await proxyRes.json();
          if (proxyData?.url && typeof proxyData.url === "string" && proxyData.url.startsWith("http")) {
            const entry: CachedDirectUrl = {
              url: proxyData.url,
              br: Number(proxyData.br) || bitrates[0],
              expiry: Date.now() + DIRECT_URL_CACHE_TTL_MS,
            };
            directUrlCache.set(cacheKey, entry);
            return entry;
          }
          // 明确确认网易云无此曲目版权（例如周杰伦）直接回退后端酷我跨平台源，不再二次等待
          if (proxyData?.notFound) {
            return null;
          }
        }
      } catch {
        clearTimeout(proxyTimeout);
        externalSignal?.removeEventListener("abort", onProxyAbort);
        if (externalSignal?.aborted) return null;
      }
    }

    // 2. 若服务端代理节点偶发被 Cloudflare 限流，再尝试浏览器直连解析作为兜底
    for (const br of bitrates) {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (externalSignal?.aborted) return null;
        const controller = new AbortController();
        const onExternalAbort = () => controller.abort();
        externalSignal?.addEventListener("abort", onExternalAbort, { once: true });
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
          const res = await fetch(
            `https://music-api.gdstudio.xyz/api.php?types=url&id=${songId}&source=netease&br=${br}`,
            { signal: controller.signal }
          );
          clearTimeout(timeout);
          externalSignal?.removeEventListener("abort", onExternalAbort);

          if (!res.ok) {
            if (res.status >= 500 && attempt === 0) {
              await new Promise((r) => setTimeout(r, 250));
              continue;
            }
            break;
          }

          const text = await res.text();
          if (!text.trim().startsWith("{")) {
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, 250));
              continue;
            }
            break;
          }

          const data = JSON.parse(text);
          if (isLikelyFullTrack(data, expectedDuration)) {
            const entry: CachedDirectUrl = {
              url: data.url,
              br: Number(data.br) || br,
              expiry: Date.now() + DIRECT_URL_CACHE_TTL_MS,
            };
            directUrlCache.set(cacheKey, entry);
            return entry;
          }

          if (!data?.url) {
            return null;
          }
          break;
        } catch {
          clearTimeout(timeout);
          externalSignal?.removeEventListener("abort", onExternalAbort);
          if (externalSignal?.aborted) {
            return null;
          }
          if (attempt === 0) {
            continue;
          }
        }
      }
    }
    return null;
  })();

  inFlightDirectRequests.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlightDirectRequests.delete(cacheKey);
  }
}

type DirectUrlState = {
  songId: number | null;
  url: string | null;
  br?: number;
  status: "idle" | "resolving" | "resolved" | "fallback";
};

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastRecordedSongRef = useRef<number | null>(null);
  const trialToastShownRef = useRef<number | null>(null);
  const { addToast } = useToastStore();
  const { recordPlay } = useHistoryStore();
  const { isAuthenticated, settings } = useUserStore();
  const [streamToken, setStreamToken] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const {
    currentSong,
    isPlaying,
    volume,
    playQueue,
    currentQueueIndex,
    setAudioRef,
    setCurrentTime,
    setDuration,
    setIsLoading,
    handleSongEnd,
  } = usePlayerStore();

  useEffect(() => {
    setAudioRef(audioRef);
  }, [setAudioRef]);

  useEffect(() => {
    if (currentSong && isAuthenticated && lastRecordedSongRef.current !== currentSong.id) {
      lastRecordedSongRef.current = currentSong.id;
      recordPlay(currentSong.id);
    }
  }, [currentSong, isAuthenticated, recordPlay]);

  const [directState, setDirectState] = useState<DirectUrlState>({
    songId: null,
    url: null,
    status: "idle",
  });

  // 客户端直连获取完整高音质/无损音轨 (突破海外 Render 云节点限制，杜绝 15s/30s 试听)
  useEffect(() => {
    if (!currentSong) {
      setDirectState({ songId: null, url: null, status: "idle" });
      return;
    }

    trialToastShownRef.current = null;

    if (isLikelyLocalSong(currentSong)) {
      setDirectState({ songId: currentSong.id, url: null, status: "fallback" });
      return;
    }

    const bitrates = getPreferredBitrates(settings?.audioQuality);
    const cacheKey = `${currentSong.id}:${bitrates[0]}`;
    const cached = directUrlCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      setDirectState({
        songId: currentSong.id,
        url: cached.url,
        br: cached.br,
        status: "resolved",
      });
      return;
    }

    // 切歌时立即进入 resolving 状态，避免先播放上一首残留地址或提前触发后端试听流
    setDirectState({ songId: currentSong.id, url: null, status: "resolving" });
    setIsLoading(true);

    let isMounted = true;
    const abortController = new AbortController();

    const resolveLosslessFullAudio = async () => {
      const resolved = await fetchGDStudioDirectUrl(
        currentSong.id,
        currentSong.duration,
        bitrates,
        abortController.signal
      );

      if (!isMounted || abortController.signal.aborted) return;

      if (resolved?.url) {
        setDirectState({
          songId: currentSong.id,
          url: resolved.url,
          br: resolved.br,
          status: "resolved",
        });
      } else {
        setDirectState({
          songId: currentSong.id,
          url: null,
          status: "fallback",
        });
      }
    };

    resolveLosslessFullAudio();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [currentSong?.id, currentSong?.duration, settings?.audioQuality, setIsLoading]);

  // 静默预解析队列中的下一首完整音轨，切歌零延迟
  const prefetchNextSong = useCallback(() => {
    if (!playQueue.length || currentQueueIndex < 0) return;
    const nextSong = playQueue[currentQueueIndex + 1];
    if (!nextSong || isLikelyLocalSong(nextSong)) return;
    const bitrates = getPreferredBitrates(settings?.audioQuality);
    void fetchGDStudioDirectUrl(nextSong.id, nextSong.duration, bitrates);
  }, [playQueue, currentQueueIndex, settings?.audioQuality]);

  const streamUrl = useMemo(() => {
    if (!currentSong) return undefined;
    // 等待当前歌曲的直连解析完成，防止抢跑加载后端 30s 试听流
    if (directState.songId !== currentSong.id || directState.status === "resolving" || directState.status === "idle") {
      return undefined;
    }
    if (directState.status === "resolved" && directState.url) {
      return directState.url;
    }
    return getStreamSrc(currentSong.id, streamToken || undefined, settings?.audioQuality);
  }, [currentSong?.id, directState, streamToken, settings?.audioQuality]);

  // 切歌等待解析期间暂停旧音频，防止上一首歌声音残留
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!streamUrl) {
      audio.pause();
      if (audio.getAttribute("src")) {
        audio.removeAttribute("src");
        audio.load();
      }
    }
  }, [streamUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (isPlaying) {
      if (!audio.src || audio.src === window.location.href || !streamUrl) {
        return;
      }
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          if (error.name !== "AbortError" && error.name !== "NotSupportedError") {
            console.warn("Playback prevented:", error);
            usePlayerStore.setState({ isPlaying: false });
            if (error.name === "NotAllowedError") {
              addToast("自动播放被浏览器拦截，请手动点击播放");
            }
          }
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSong, streamUrl, addToast]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const { setAnalyser } = usePlayerStore();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || sourceRef.current) return;

    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;

      const ctx = new AudioContextCtor();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;

      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      sourceRef.current = source;
      setAnalyser(analyser);

      const handlePlay = () => {
        if (ctx.state === 'suspended') ctx.resume();
      };

      audio.addEventListener('play', handlePlay);

      return () => {
        audio.removeEventListener('play', handlePlay);
      };
    } catch (e) {
      console.error("Audio Visualization Setup Failed:", e);
    }
  }, [audioRef.current, setAnalyser]);

  useEffect(() => {
    let isMounted = true;
    
    // Reset token when song changes
    setStreamToken(null);
    setRetryCount(0);

    if (!currentSong || !isAuthenticated) {
      return;
    }

    const fetchToken = async () => {
      try {
        const data = await apiClient<{ token: string }>(`/api/songs/${currentSong.id}/stream-token`);
        if (isMounted && data.token) {
          setStreamToken(data.token);
        }
      } catch (err) {
        if (isMounted) console.error("Failed to fetch stream token:", err);
      }
    };

    fetchToken();

    return () => {
      isMounted = false;
    };
  }, [currentSong?.id, isAuthenticated]);

  if (!currentSong) return null;

  return (
    <audio
      ref={audioRef}
      onContextMenu={(e) => e.preventDefault()}
      src={streamUrl}
      crossOrigin="anonymous"
      preload="auto"
      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => {
        const audioDur = e.currentTarget.duration;
        const songDur = currentSong?.duration;
        const hasValidAudioDur = Boolean(audioDur && !isNaN(audioDur) && isFinite(audioDur));
        const isTrialClip =
          hasValidAudioDur &&
          Boolean(songDur && songDur > 75 && audioDur < Math.min(55, songDur * 0.45));

        if (isTrialClip) {
          // 如果直连拿到的是 15s/30s 试听片段，清缓存并立即切换后端多源解析（如酷我完整源）
          if (directState.status === "resolved" && currentSong) {
            const bitrates = getPreferredBitrates(settings?.audioQuality);
            directUrlCache.delete(`${currentSong.id}:${bitrates[0]}`);
            setDirectState({ songId: currentSong.id, url: null, status: "fallback" });
            return;
          }
          // 后端兜底也仅返回试听片段时，按真实可播时长显示进度条并提示，避免进度条假装 4 分钟却在 15/30 秒突然跳歌
          setDuration(audioDur);
          if (currentSong && trialToastShownRef.current !== currentSong.id) {
            trialToastShownRef.current = currentSong.id;
            addToast("该歌曲受版权限制，当前仅提供试听片段");
          }
        } else if (songDur && songDur > 0) {
          if (hasValidAudioDur) {
            if (Math.abs(audioDur - songDur) <= 4) {
              setDuration(audioDur);
            } else {
              setDuration(songDur);
            }
          } else {
            setDuration(songDur);
          }
        } else if (hasValidAudioDur) {
          setDuration(audioDur);
        }

        setIsLoading(false);
        if (isPlaying) {
          e.currentTarget.play().catch((error) => {
            if (error.name !== "AbortError" && error.name !== "NotSupportedError") {
              console.warn("Autoplay failed:", error);
              usePlayerStore.setState({ isPlaying: false });
            }
          });
        }
      }}
      onEnded={handleSongEnd}
      onWaiting={() => setIsLoading(true)}
      onCanPlay={() => {
        setIsLoading(false);
        prefetchNextSong();
      }}
      onError={async (e) => {
        const audio = audioRef.current;
        if (!audio?.src || audio.src === window.location.href || !streamUrl) {
          return;
        }
        console.warn("Audio playback error:", e);
        if (directState.status === "resolved" && currentSong) {
          const bitrates = getPreferredBitrates(settings?.audioQuality);
          directUrlCache.delete(`${currentSong.id}:${bitrates[0]}`);
          setDirectState({ songId: currentSong.id, url: null, status: "fallback" });
          return;
        }
        if (currentSong && retryCount < 1) {
          setRetryCount((prev) => prev + 1);
          try {
            const data = await apiClient<{ token: string }>(`/api/songs/${currentSong.id}/stream-token`);
            if (data?.token) {
              setStreamToken(data.token);
              return;
            }
          } catch (err) {
            // ignore
          }
        }
        setIsLoading(false);
        usePlayerStore.setState({ isPlaying: false });
        addToast("播放失败，请检查网络或音频文件");
      }}
    />
  );
};

export default AudioPlayer;

