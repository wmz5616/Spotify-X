"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, TvMinimalPlay, LoaderCircle, AlertCircle, Maximize2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { usePlayerStore } from "@/store/usePlayerStore";
import clsx from "clsx";

interface MvClarityOption {
  clarity: string;
  url: string;
}

interface MvResult {
  hasMv: boolean;
  id?: number;
  title?: string;
  artistName?: string;
  cover?: string;
  duration?: number;
  playCount?: number;
  url?: string;
  clarityList?: MvClarityOption[];
}

interface MvPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  songTitle?: string;
  artistName?: string;
  duration?: number | null;
}

const MvPlayerModal: React.FC<MvPlayerModalProps> = ({
  isOpen,
  onClose,
  songTitle,
  artistName,
  duration,
}) => {
  const [loading, setLoading] = useState(true);
  const [mvData, setMvData] = useState<MvResult | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [selectedClarity, setSelectedClarity] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { isPlaying, togglePlayPause } = usePlayerStore();

  // 按 ESC 键快速关闭弹窗
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setMvData(null);
      setCurrentUrl("");
      return;
    }

    // 打开 MV 时自动暂停底部背景音频，避免声音打架
    if (isPlaying) {
      togglePlayPause();
    }

    if (!songTitle) {
      setLoading(false);
      setMvData({ hasMv: false });
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchMv = async () => {
      try {
        const queryParams: Record<string, string> = {
          title: songTitle,
          artist: artistName || "",
        };
        if (duration) {
          queryParams.duration = String(duration);
        }

        const res = await apiClient<MvResult>("/api/mv", {
          params: queryParams,
        });
        if (!isMounted) return;

        setMvData(res);
        if (res?.hasMv && res.url) {
          setCurrentUrl(res.url);
          if (res.clarityList && res.clarityList.length > 0) {
            setSelectedClarity(res.clarityList[0].clarity);
          }
        }
      } catch (err) {
        console.error("Failed to fetch MV:", err);
        if (isMounted) {
          setMvData({ hasMv: false });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMv();

    return () => {
      isMounted = false;
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, [isOpen, songTitle, artistName, duration]);

  // 切换画质时保留播放进度
  const handleClarityChange = (option: MvClarityOption) => {
    if (option.url === currentUrl) return;
    const currentTime = videoRef.current?.currentTime || 0;
    const wasPaused = videoRef.current?.paused ?? false;

    setSelectedClarity(option.clarity);
    setCurrentUrl(option.url);

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime;
        if (!wasPaused) {
          videoRef.current.play().catch(() => { });
        }
      }
    }, 50);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 md:p-10 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#141414] border border-white/10 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-white/5 bg-[#181818]/60">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/25 shrink-0">
              <TvMinimalPlay size={13} />
              MV
            </span>
            <div className="flex flex-col overflow-hidden">
              <h3 className="text-white font-bold text-sm sm:text-base truncate">
                {mvData?.title || songTitle || "音乐视频"}
              </h3>
              <p className="text-neutral-400 text-xs truncate">
                {mvData?.artistName || artistName || "未知歌手"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* 画质切换按钮组 */}
            {mvData?.clarityList && mvData.clarityList.length > 1 && (
              <div className="hidden sm:flex items-center bg-black/40 rounded-full p-0.5 border border-white/5">
                {mvData.clarityList.map((opt) => (
                  <button
                    key={opt.clarity}
                    onClick={() => handleClarityChange(opt)}
                    className={clsx(
                      "px-2.5 py-1 text-xs font-semibold rounded-full transition-colors",
                      selectedClarity === opt.clarity
                        ? "bg-white/20 text-white shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    )}
                  >
                    {opt.clarity}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title="关闭"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 视频主播放区 */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-neutral-400">
              <LoaderCircle size={36} className="text-green-500 animate-spin" />
            </div>
          ) : mvData?.hasMv && currentUrl ? (
            <video
              ref={videoRef}
              src={currentUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center mb-4 text-neutral-500">
                <AlertCircle size={32} />
              </div>
              <h4 className="text-white font-bold text-lg mb-1">未找到关联的音乐视频</h4>
            </div>
          )}
        </div>

        {/* 底部信息栏 */}
        {mvData?.hasMv && (
          <div className="px-5 py-2.5 bg-[#121212] border-t border-white/5 flex items-center justify-between text-xs text-neutral-400">
          </div>
        )}
      </div>
    </div>
  );
};

export default MvPlayerModal;
