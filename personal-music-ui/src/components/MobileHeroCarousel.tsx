"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { getAuthenticatedSrc } from "@/lib/api-client";
import { cleanSongTitle } from "@/lib/utils";
import type { Song } from "@/types";

interface MobileHeroCarouselProps {
  hotSongs?: Song[];
}

export default function MobileHeroCarousel({ hotSongs = [] }: MobileHeroCarouselProps) {
  const { currentSong, isPlaying, playSong, togglePlayPause } = usePlayerStore();

  const featuredSong = hotSongs[0] || currentSong || null;
  const isPlayingFeatured = featuredSong && currentSong?.id === featuredSong.id && isPlaying;

  const handlePlayFeatured = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!featuredSong) return;

    if (currentSong?.id === featuredSong.id) {
      togglePlayPause();
    } else {
      playSong(featuredSong, hotSongs);
    }
  };

  const coverUrl = featuredSong?.album?.coverPath
    ? getAuthenticatedSrc(featuredSong.album.coverPath, 200)
    : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80";

  return (
    <div className="md:hidden w-full overflow-hidden select-none py-1 mb-4">
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar px-1 py-1">
        {/* 卡片 1：猜你喜欢 (高阶极简对比、无浮夸大光晕、雅致活力浅绿主播放纽扣) */}
        <div className="snap-start shrink-0 w-[84%] max-w-[325px] rounded-2xl bg-white dark:bg-[#181818] p-3 text-neutral-900 dark:text-white border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-between gap-2.5 h-[112px] relative overflow-hidden shadow-[0_3px_12px_rgba(0,0,0,0.05)] dark:shadow-none">
          {/* 左侧：精美封面 + 拟物黑胶唱片 */}
          <div className="relative flex items-center shrink-0">
            <div
              className={`w-14 h-14 rounded-full bg-[#121212] border-2 border-neutral-800 shadow-sm flex items-center justify-center absolute left-5 z-0 transition-transform duration-700 ${
                isPlayingFeatured ? "animate-[spin_10s_linear_infinite]" : "rotate-12"
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-[#202020] border border-neutral-700 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-neutral-400" />
              </div>
            </div>

            <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-sm z-10 bg-neutral-100 dark:bg-neutral-800 border border-black/5 dark:border-white/10">
              <Image
                src={coverUrl}
                alt={featuredSong?.title || "推荐封面"}
                fill
                className="object-cover"
                unoptimized
              />
              {isPlayingFeatured && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 bg-white rounded-full animate-bar-1" />
                    <span className="w-0.5 bg-white rounded-full animate-bar-2" />
                    <span className="w-0.5 bg-white rounded-full animate-bar-3" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 中间：信息区域 */}
          <div className="min-w-0 flex-1 pl-2">
            <span className="inline-block text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5 rounded-full mb-1">
              猜你喜欢
            </span>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
              {featuredSong ? cleanSongTitle(featuredSong.title, featuredSong.artist) : "精选好歌"}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              {featuredSong?.artist || "为你量身推荐"}
            </p>
          </div>

          {/* 右侧：精致活力浅翠绿播放纽扣 (小巧利落无大光晕，高反差黑三角，瞬间打破死板) */}
          <button
            onClick={handlePlayFeatured}
            className="w-10 h-10 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] text-neutral-950 flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer shadow-[0_2px_10px_rgba(30,215,96,0.28)]"
            title={isPlayingFeatured ? "暂停" : "播放"}
          >
            {isPlayingFeatured ? (
              <Pause size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" className="translate-x-[0.5px]" />
            )}
          </button>
        </div>

        {/* 卡片 2：每日 30 首 */}
        <Link
          href="/discover"
          className="snap-start shrink-0 w-[84%] max-w-[325px] rounded-2xl bg-white dark:bg-[#181818] p-3 text-neutral-900 dark:text-white border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-between gap-2.5 h-[112px] relative overflow-hidden group shadow-[0_3px_12px_rgba(0,0,0,0.05)] dark:shadow-none"
        >
          {/* 左侧：Daily 30 艺术唱片盒 */}
          <div className="w-16 h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex flex-col items-center justify-center shadow-sm shrink-0 border border-neutral-200/80 dark:border-white/10">
            <span className="text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest leading-none">
              DAILY
            </span>
            <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none mt-0.5">
              30
            </span>
          </div>

          {/* 中间：信息区域 */}
          <div className="min-w-0 flex-1 pl-1">
            <span className="inline-block text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5 rounded-full mb-1">
              专属定制
            </span>
            <div className="text-sm font-bold text-neutral-900 dark:text-white">
              每日 30 首
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
              个性化探索 · 每天 6:00 更新
            </p>
          </div>

          {/* 右侧：播放按钮 */}
          <div className="w-10 h-10 rounded-full bg-[#1ed760] text-neutral-950 flex items-center justify-center shrink-0 group-hover:scale-105 active:scale-90 transition-all shadow-[0_2px_10px_rgba(30,215,96,0.28)]">
            <Play size={15} fill="currentColor" className="translate-x-[0.5px]" />
          </div>
        </Link>

        {/* 卡片 3：华语热歌 TOP 50 */}
        <Link
          href="#featured-charts"
          className="snap-start shrink-0 w-[84%] max-w-[325px] rounded-2xl bg-white dark:bg-[#181818] p-3 text-neutral-900 dark:text-white border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-between gap-2.5 h-[112px] relative overflow-hidden group shadow-[0_3px_12px_rgba(0,0,0,0.05)] dark:shadow-none"
        >
          {/* 左侧：TOP 50 徽章 */}
          <div className="w-16 h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex flex-col items-center justify-center shadow-sm shrink-0 border border-neutral-200/80 dark:border-white/10">
            <span className="text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest leading-none">
              HOT
            </span>
            <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none mt-0.5">
              50
            </span>
          </div>

          {/* 中间：信息区域 */}
          <div className="min-w-0 flex-1 pl-1">
            <span className="inline-block text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5 rounded-full mb-1">
              官方巅峰
            </span>
            <div className="text-sm font-bold text-neutral-900 dark:text-white">
              华语热歌榜
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
              全网真实数千万收藏热作
            </p>
          </div>

          {/* 右侧：播放按钮 */}
          <div className="w-10 h-10 rounded-full bg-[#1ed760] text-neutral-950 flex items-center justify-center shrink-0 group-hover:scale-105 active:scale-90 transition-all shadow-[0_2px_10px_rgba(30,215,96,0.28)]">
            <Play size={15} fill="currentColor" className="translate-x-[0.5px]" />
          </div>
        </Link>
      </div>
    </div>
  );
}
