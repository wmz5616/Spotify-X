"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Pause,
  Shuffle,
  Heart,
  Maximize2,
  Disc3,
  Radio,
  Volume2,
  RotateCw,
} from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";
import { parseLRC, type LyricLine } from "@/lib/lrc-parser";
import { formatDuration } from "@/lib/utils";
import type { Song } from "@/types";

export default function DiscoverPage() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    playSong,
    togglePlayPause,
    playQueue,
    setFullScreen,
  } = usePlayerStore();

  const { isSongFavorited, toggleFavoriteSong } = useFavoritesStore();

  const [candidateSongs, setCandidateSongs] = useState<Song[]>([]);
  const [lyricsData, setLyricsData] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. 如果当前没有播放歌曲，自动从热歌榜或推荐拉取曲目
  useEffect(() => {
    const fetchHotSongs = async () => {
      try {
        const chartData = await apiClient<{ songs?: Song[] }>(
          "/api/albums/3778678"
        ).catch(() => null);

        if (chartData?.songs && chartData.songs.length > 0) {
          setCandidateSongs(chartData.songs);
          // 如果当前没有任何歌曲在播放，自动播放第一首
          const state = usePlayerStore.getState();
          if (!state.currentSong) {
            state.playSong(chartData.songs[0], chartData.songs);
          }
        }
      } catch (err) {
        console.error("加载刷歌推荐失败:", err);
      }
    };

    fetchHotSongs();
  }, []);

  // 2. 监听当前歌曲变化，获取歌词
  useEffect(() => {
    setLyricsData(null);
    if (!currentSong) return;

    if (currentSong.lyrics) {
      setLyricsData(currentSong.lyrics);
    } else {
      apiClient<{ lyrics?: string }>(`/api/songs/${currentSong.id}/lyrics`)
        .then((data) => {
          if (data?.lyrics) {
            setLyricsData(data.lyrics);
          }
        })
        .catch(() => {});
    }
  }, [currentSong?.id, currentSong?.lyrics]);

  // 3. 解析当前歌词行
  const parsedLyrics: LyricLine[] = useMemo(() => {
    return lyricsData ? parseLRC(lyricsData) : [];
  }, [lyricsData]);

  const currentLyricLine = useMemo(() => {
    if (!parsedLyrics.length) return null;
    let foundIndex = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time) {
        foundIndex = i;
      } else {
        break;
      }
    }
    return foundIndex >= 0 ? parsedLyrics[foundIndex].text : null;
  }, [parsedLyrics, currentTime]);

  // 4. “刷一首”逻辑：随机换一首并播放
  const handleBrushNext = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);

    const pool =
      candidateSongs.length > 0
        ? candidateSongs
        : playQueue.length > 0
        ? playQueue
        : [];

    if (!pool.length) return;

    // 随机选择一首与当前不同的歌曲
    const filtered = pool.filter((s) => s.id !== currentSong?.id);
    const nextSong =
      filtered.length > 0
        ? filtered[Math.floor(Math.random() * filtered.length)]
        : pool[0];

    playSong(nextSong, pool);
  };

  const isFavorited = currentSong ? isSongFavorited(currentSong.id) : false;

  return (
    <div className="max-w-md mx-auto flex flex-col items-center justify-between min-h-[calc(100vh-180px)] px-2 py-4 select-none">
      {/* 顶部标签 */}
      <div className="flex items-center gap-1.5 bg-[#18181a] border border-white/10 px-3.5 py-1.5 rounded-full shadow-md">
        <Radio size={14} className="text-[#1ed760]" />
        <span className="text-xs text-neutral-300 font-medium tracking-wide">
          沉浸刷歌 · 听见好声音
        </span>
      </div>

      {/* 核心展示区：唱片 / 封面 */}
      <div className="flex flex-col items-center justify-center my-auto w-full py-4">
        {/* 动态唱片容器 */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-3 flex items-center justify-center">
          {/* 黑胶底盘 */}
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-tr from-black via-[#141416] to-[#222225] p-2 shadow-2xl border-4 border-white/5 transition-transform duration-700 ease-linear ${
              isPlaying ? "animate-[spin_20s_linear_infinite]" : ""
            }`}
          >
            {/* 唱片黑胶纹理环 */}
            <div className="w-full h-full rounded-full border border-white/10 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-4 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-8 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-12 rounded-full border border-white/[0.04]" />

              {/* 唱片核心封面 */}
              <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden border-2 border-black/80 shadow-inner">
                {currentSong?.album?.coverPath ? (
                  <Image
                    src={getAuthenticatedSrc(currentSong.album.coverPath)}
                    alt={currentSong.title || "专辑封面"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#202022] flex items-center justify-center text-neutral-600">
                    <Disc3 size={48} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 歌曲与艺术家信息 */}
        <div className="text-center px-4 mt-4 w-full">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
            {currentSong?.title || "正在加载精选歌曲..."}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 truncate">
            {currentSong?.artist || "未知歌手"}
          </p>
        </div>

        {/* 动态歌词预览卡片 */}
        <div className="mt-4 w-full max-w-sm px-4">
          <div className="bg-[#18181a]/80 backdrop-blur-md border border-white/5 rounded-xl py-2.5 px-4 text-center min-h-[44px] flex items-center justify-center shadow-inner">
            <p className="text-xs sm:text-sm text-[#1ed760] font-medium transition-all duration-300 line-clamp-2">
              {currentLyricLine || (isPlaying ? "♪ 享受音乐旋律 ♪" : "点击播放开始刷歌")}
            </p>
          </div>
        </div>
      </div>

      {/* 底部功能控制操作栏 */}
      <div className="w-full max-w-sm px-4 pb-2 space-y-4">
        {/* 主控制按钮行 */}
        <div className="flex items-center justify-around gap-4 bg-[#18181a] border border-white/5 rounded-2xl p-3 shadow-lg">
          {/* 喜欢按钮 */}
          <button
            onClick={() => {
              if (currentSong) toggleFavoriteSong(currentSong.id);
            }}
            className="p-3 text-neutral-400 hover:text-white transition-all active:scale-90"
            title="收藏歌曲"
          >
            <Heart
              size={22}
              className={
                isFavorited
                  ? "fill-red-500 text-red-500 transition-colors"
                  : "hover:text-white transition-colors"
              }
            />
          </button>

          {/* 播放/暂停控制 */}
          <button
            onClick={togglePlayPause}
            className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
            title={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? (
              <Pause size={24} className="fill-current" />
            ) : (
              <Play size={24} className="fill-current ml-1" />
            )}
          </button>

          {/* “刷一首”换歌按钮 */}
          <button
            onClick={handleBrushNext}
            className="flex flex-col items-center gap-1 p-2 text-neutral-300 hover:text-white active:scale-90 transition-all group"
            title="换一首"
          >
            <div
              className={`p-2 rounded-full bg-[#242428] group-hover:bg-[#2c2c30] transition-transform ${
                isRefreshing ? "rotate-180" : ""
              }`}
            >
              <RotateCw size={18} className="text-[#1ed760]" />
            </div>
            <span className="text-[10px] text-neutral-400">刷一首</span>
          </button>

          {/* 全屏歌词播放器 */}
          <button
            onClick={() => setFullScreen(true)}
            className="p-3 text-neutral-400 hover:text-white transition-all active:scale-90"
            title="展开全屏播放器"
          >
            <Maximize2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
