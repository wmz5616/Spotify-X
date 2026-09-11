"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useToastStore } from "@/store/useToastStore";
import { useHistoryStore } from "@/store/useHistoryStore";
import { useUserStore } from "@/store/useUserStore";
import { getAuthenticatedSrc, getStreamSrc, apiClient } from "@/lib/api-client";

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastRecordedSongRef = useRef<number | null>(null);
  const { addToast } = useToastStore();
  const { recordPlay } = useHistoryStore();
  const { isAuthenticated, settings } = useUserStore();
  const [streamToken, setStreamToken] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const {
    currentSong,
    isPlaying,
    volume,
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

  const streamUrl = useMemo(() => {
    if (!currentSong) return undefined;
    return getStreamSrc(currentSong.id, streamToken || undefined, settings?.audioQuality);
  }, [currentSong?.id, streamToken, settings?.audioQuality]);

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
        if (songDur && songDur > 0) {
          if (audioDur && !isNaN(audioDur) && isFinite(audioDur)) {
            if (Math.abs(audioDur - songDur) <= 4) {
              setDuration(audioDur);
            } else {
              setDuration(songDur);
            }
          } else {
            setDuration(songDur);
          }
        } else if (audioDur && !isNaN(audioDur) && isFinite(audioDur)) {
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
      onCanPlay={() => setIsLoading(false)}
      onError={async (e) => {
        const audio = audioRef.current;
        if (!audio?.src || audio.src === window.location.href || !streamUrl) {
          return;
        }
        console.warn("Audio playback error:", e);
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

