"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ChevronUp,
  Heart,
  Mic2,
  ListMusic,
  TvMinimalPlay,
  Maximize2,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useToastStore } from "@/store/useToastStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { useUserStore } from "@/store/useUserStore";
import ProgressBar from "./ProgressBar";
import VolumeControl from "./VolumeControl";
import FullScreenPlayer from "./FullScreenPlayer";
import LyricsPanel from "./LyricsPanel";
import LikeButton from "./LikeButton";
import AudioVisualizer from "./AudioVisualizer";
import QueuePanel from "./QueuePanel";
import MvPlayerModal from "./MvPlayerModal";
import { cn, cleanSongTitle } from "@/lib/utils";
import { getAuthenticatedSrc } from "@/lib/api-client";
const MobileCapsuleProgressBar = ({
  currentTime,
  duration,
  isPlaying,
}: {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}) => {
  const containerRef = React.useRef<SVGSVGElement>(null);
  const trackRef = React.useRef<SVGRectElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [totalLength, setTotalLength] = useState(0);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
        }
      }
    };

    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener("resize", updateSize);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  useEffect(() => {
    if (trackRef.current && typeof trackRef.current.getTotalLength === "function") {
      try {
        const len = trackRef.current.getTotalLength();
        if (len > 0) {
          setTotalLength(len);
          return;
        }
      } catch { }
    }
    const { width, height } = dimensions;
    if (width > 0 && height > 0) {
      const strokeWidth = 2;
      const w = width - strokeWidth;
      const h = height - strokeWidth;
      const perimeter = 2 * Math.max(0, w - h) + Math.PI * h;
      setTotalLength(perimeter);
    }
  }, [dimensions]);

  const progress = duration > 0 ? Math.min(Math.max(currentTime / duration, 0), 1) : 0;
  const strokeWidth = 2;
  const w = Math.max(0, dimensions.width - strokeWidth);
  const h = Math.max(0, dimensions.height - strokeWidth);
  const radius = Math.max(0, h / 2);
  const dashOffset = totalLength > 0 ? totalLength * (1 - progress) : 0;

  if (dimensions.width === 0 || dimensions.height === 0) {
    return <svg ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
  }

  return (
    <svg
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20"
      width={dimensions.width}
      height={dimensions.height}
    >
      {/* 1. 底层静止边框轨道 */}
      <rect
        ref={trackRef}
        x={strokeWidth / 2}
        y={strokeWidth / 2}
        width={w}
        height={h}
        rx={radius}
        ry={radius}
        fill="none"
        stroke="currentColor"
        className="text-neutral-200/90 dark:text-white/10 transition-colors"
        strokeWidth={1.5}
      />

      {/* 2. 实时顺时针流动的翠绿动态进度边框 (顺序环绕：顶边 -> 右半圆 -> 底边 -> 左半圆) */}
      {totalLength > 0 && progress > 0 && (
        <rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={w}
          height={h}
          rx={radius}
          ry={radius}
          fill="none"
          stroke="#1ed760"
          strokeWidth={2}
          strokeDasharray={`${totalLength} ${totalLength}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{
            transition: isPlaying ? "stroke-dashoffset 0.3s linear" : "stroke-dashoffset 0.1s ease-out",
            filter: isPlaying ? "drop-shadow(0 0 3px rgba(30, 215, 96, 0.55))" : "none",
          }}
        />
      )}
    </svg>
  );
};

const PlayerControls = () => {
  const {
    isPlaying,
    togglePlayPause,
    currentSong,
    currentTime,
    duration,
    playNext,
    playPrev,
    playMode,
    toggleShuffle,
    toggleRepeat,
    toggleFullScreen,
  } = usePlayerStore();
  const { addToast } = useToastStore();
  const { isSongFavorited, toggleFavoriteSong } = useFavoritesStore();
  const { isAuthenticated } = useUserStore();

  const [isMounted, setIsMounted] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showMv, setShowMv] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isLiked = currentSong ? isSongFavorited(currentSong.id) : false;

  const handleLikeToggle = async () => {
    if (!currentSong) return;
    if (!isAuthenticated) {
      addToast("请先登录");
      return;
    }
    const success = await toggleFavoriteSong(currentSong.id);
    if (success) {
      addToast(isLiked ? "已取消收藏" : "已添加到收藏");
    }
  };

  if (!isMounted)
    return <div className="hidden md:block h-[90px] bg-black border-t border-[#282828]" />;

  if (!currentSong) {
    return (
      <footer className="hidden md:flex fixed bottom-0 z-50 w-full h-[90px] bg-black border-t border-[#282828] px-4 items-center justify-between">
        <div className="text-[#a7a7a7] text-sm">选择一首要播放的歌曲</div>
      </footer>
    );
  }

  const albumData = currentSong.album as any;
  const tParam = albumData?.title ? `&t=${encodeURIComponent(albumData.title)}` : "";
  const albumArtUrl = albumData?.coverPath
    ? getAuthenticatedSrc(albumData.coverPath, 150)
    : albumData?.id
      ? getAuthenticatedSrc(`api/covers/${albumData.id}?size=128${tParam}`)
      : "/placeholder.jpg";

  const renderRepeatIcon = () => {
    if (playMode === "repeat-one") return <Repeat1 size={16} />;
    return <Repeat size={16} />;
  };

  return (
    <>
      <div className="hidden md:block fixed bottom-[90px] left-0 right-0 z-40 px-4 pointer-events-none">
        <AudioVisualizer
          isPlaying={isPlaying}
          barCount={128}
          height={24}
          color="#1db954"
          className="w-full max-w-2xl mx-auto opacity-90"
        />
      </div>
      <footer
        className="hidden md:grid fixed bottom-0 z-50 w-full h-[90px] bg-black border-t border-[#282828] px-4 grid-cols-[30%_40%_30%] items-center select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative group flex-shrink-0">
            <div className="relative w-14 h-14 rounded overflow-hidden shadow-lg cursor-pointer">
              <Image
                src={albumArtUrl}
                alt={currentSong.title}
                fill
                className="object-cover"
                unoptimized
              />
              <button
                onClick={toggleFullScreen}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
              >
                <ChevronUp size={14} className="text-white" />
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-center overflow-hidden mr-2">
            <Link
              href={albumData?.id ? `/album/${albumData.id}` : "#"}
              className="font-medium text-sm text-white hover:underline truncate cursor-pointer"
            >
              {cleanSongTitle(currentSong.title, currentSong.artist || albumData?.artists)}
            </Link>
            <div className="text-xs text-[#b3b3b3] truncate group">
              {(() => {
                const rawArtist = currentSong.artist?.trim();
                if (rawArtist) {
                  const names = rawArtist.split(/\s*[/,&、]\s*/).filter(Boolean);
                  if (names.length > 0) {
                    return names.map((name, i) => (
                      <span key={name + i}>
                        <Link
                          href={`/artist/${encodeURIComponent(name)}`}
                          className="hover:text-white hover:underline transition-colors"
                        >
                          {name}
                        </Link>
                        {i < names.length - 1 && ", "}
                      </span>
                    ));
                  }
                }

                if (albumData?.artists && albumData.artists.length > 0) {
                  return albumData.artists.map((artist: any, i: number) => (
                    <span key={artist.id || i}>
                      <Link
                        href={`/artist/${encodeURIComponent(artist.name)}`}
                        className="hover:text-white hover:underline transition-colors"
                      >
                        {artist.name}
                      </Link>
                      {i < albumData.artists.length - 1 && ", "}
                    </span>
                  ));
                }

                return (
                  <span className="hover:text-white cursor-pointer transition-colors">
                    {currentSong.artist || "未知歌手"}
                  </span>
                );
              })()}
            </div>
          </div>

          <LikeButton
            isLiked={isLiked}
            onToggle={handleLikeToggle}
            size={18}
            className="flex-shrink-0"
            inactiveColor="text-[#b3b3b3] hover:text-white"
          />
        </div>

        <div className="flex flex-col items-center justify-center gap-1.5 max-w-[722px] w-full mx-auto">
          <div className="flex items-center gap-6 mb-1">
            <button
              onClick={toggleShuffle}
              className={cn(
                "transition-colors relative",
                playMode === "shuffle"
                  ? "text-green-500"
                  : "text-[#b3b3b3] hover:text-white",
                playMode === "shuffle" &&
                "after:content-[''] after:block after:w-1 after:h-1 after:bg-green-500 after:rounded-full after:mx-auto after:mt-1 after:absolute after:left-1/2 after:-translate-x-1/2"
              )}
              title="Enable Shuffle"
            >
              <Shuffle size={16} />
            </button>

            <button
              onClick={playPrev}
              className="text-[#b3b3b3] hover:text-white transition-colors"
              title="Previous"
            >
              <SkipBack size={20} fill="currentColor" />
            </button>

            <button
              onClick={togglePlayPause}
              className="bg-white rounded-full p-2 hover:scale-105 active:scale-95 transition-transform shadow-sm"
            >
              {isPlaying ? (
                <Pause size={20} fill="black" className="text-black" />
              ) : (
                <Play size={20} fill="black" className="text-black ml-0.5" />
              )}
            </button>

            <button
              onClick={playNext}
              className="text-[#b3b3b3] hover:text-white transition-colors"
              title="Next"
            >
              <SkipForward size={20} fill="currentColor" />
            </button>

            <button
              onClick={toggleRepeat}
              className={cn(
                "transition-colors relative",
                playMode.includes("repeat")
                  ? "text-green-500"
                  : "text-[#b3b3b3] hover:text-white",
                playMode.includes("repeat") &&
                "after:content-[''] after:block after:w-1 after:h-1 after:bg-green-500 after:rounded-full after:mx-auto after:mt-1 after:absolute after:left-1/2 after:-translate-x-1/2"
              )}
              title="Enable Repeat"
            >
              {renderRepeatIcon()}
            </button>
          </div>

          <ProgressBar />
        </div>

        <div className="flex items-center justify-end gap-3 min-w-0">
          <button
            onClick={() => {
              setShowLyrics(!showLyrics);
              if (showQueue) setShowQueue(false);
            }}
            className={cn(
              "transition-colors p-1",
              showLyrics ? "text-green-500" : "text-[#b3b3b3] hover:text-white"
            )}
            title="歌词"
          >
            <Mic2 size={16} />
          </button>

          <button
            onClick={() => {
              setShowQueue(!showQueue);
              if (showLyrics) setShowLyrics(false);
            }}
            className={cn(
              "transition-colors p-1",
              showQueue ? "text-green-500" : "text-[#b3b3b3] hover:text-white"
            )}
            title="播放队列"
          >
            <ListMusic size={16} />
          </button>

          <button
            onClick={() => {
              if (!currentSong) {
                addToast("请先选择一首歌曲播放");
                return;
              }
              setShowMv(true);
            }}
            className={cn(
              "transition-all duration-150 p-1 hover:scale-110 active:scale-95",
              showMv ? "text-green-500" : "text-[#b3b3b3] hover:text-white"
            )}
            title="MV"
          >
            <TvMinimalPlay size={17} />
          </button>

          <div className="flex items-center gap-2 w-32">
            <VolumeControl />
          </div>

          <button
            onClick={toggleFullScreen}
            className="text-[#b3b3b3] hover:text-white transition-colors p-1 ml-1"
            title="Full Screen"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </footer>

      {/* 移动端专属浮动迷你播放器 (仿QQ音乐胶囊设计，边缘为实时流动的绿色进度条) */}
      <div
        onClick={toggleFullScreen}
        className="md:hidden fixed bottom-[66px] left-3 right-3 z-40 h-[52px] bg-white/95 text-neutral-900 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:bg-[#18181a]/95 dark:text-white dark:shadow-[0_8px_28px_rgba(0,0,0,0.7)] backdrop-blur-xl rounded-full pl-2.5 pr-3.5 flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer select-none"
      >
        {/* 椭圆形边缘实时顺序流动的绿色进度条 */}
        <MobileCapsuleProgressBar
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
        />

        {/* 左侧：封面与歌曲信息 */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2 relative z-10">
          <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-black/5 dark:border-white/15 bg-neutral-200 dark:bg-neutral-800 shadow-sm">
            <Image
              src={albumArtUrl}
              alt={currentSong.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
              {cleanSongTitle(currentSong.title, currentSong.artist || albumData?.artists)}
            </p>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              {currentSong.artist || "未知歌手"}
            </p>
          </div>
        </div>

        {/* 右侧：播放/暂停控制与列表入口 */}
        <div className="flex items-center gap-1.5 flex-shrink-0 relative z-10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={togglePlayPause}
            className="w-8 h-8 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center transition-transform active:scale-90 shadow-sm"
            aria-label={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? (
              <Pause size={13} className="text-white dark:text-neutral-900 fill-white dark:fill-neutral-900" />
            ) : (
              <Play size={13} className="text-white dark:text-neutral-900 fill-white dark:fill-neutral-900 translate-x-[0.5px]" />
            )}
          </button>

          <button
            onClick={() => {
              setShowQueue(!showQueue);
              if (showLyrics) setShowLyrics(false);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors active:scale-90"
            aria-label="播放队列"
          >
            <ListMusic size={17} />
          </button>
        </div>
      </div>

      <FullScreenPlayer />
      <LyricsPanel isOpen={showLyrics} onClose={() => setShowLyrics(false)} />
      <QueuePanel isOpen={showQueue} onClose={() => setShowQueue(false)} />
      <MvPlayerModal
        isOpen={showMv}
        onClose={() => setShowMv(false)}
        songTitle={cleanSongTitle(currentSong?.title, currentSong?.artist)}
        artistName={
          currentSong?.artist ||
          (currentSong?.album as any)?.artists?.[0]?.name ||
          (currentSong?.album as any)?.artist
        }
        duration={currentSong?.duration}
      />
    </>
  );
};

export default PlayerControls;

