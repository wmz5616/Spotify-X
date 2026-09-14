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
        {/* 卡片 1：猜你喜欢 (清新翡翠绿调渐变背景，契合音乐与 Spotify 绿核) */}
        <div className="snap-start shrink-0 w-[84%] max-w-[325px] rounded-2xl bg-gradient-to-br from-emerald-50/90 via-teal-50/30 to-white dark:from-emerald-950/40 dark:via-[#16231c] dark:to-[#121614] p-3 text-neutral-900 dark:text-white border border-emerald-200/70 dark:border-emerald-500/20 flex items-center justify-between gap-2.5 h-[112px] relative overflow-hidden shadow-[0_4px_16px_rgba(16,185,129,0.08)] dark:shadow-none">
          {/* 背景环境柔光 */}
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-emerald-400/20 dark:bg-emerald-400/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-6 w-20 h-20 rounded-full bg-teal-400/15 dark:bg-teal-400/10 blur-xl pointer-events-none" />

          {/* 左侧：精美封面 + 拟物黑胶唱片 */}
          <div className="relative flex items-center shrink-0 z-10">
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
          <div className="min-w-0 flex-1 pl-2 relative z-10">
            <span className="inline-block text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 px-2 py-0.5 rounded-full mb-1">
              猜你喜欢
            </span>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
              {featuredSong ? cleanSongTitle(featuredSong.title, featuredSong.artist) : "精选好歌"}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              {featuredSong?.artist || "为你量身推荐"}
            </p>
          </div>

          {/* 右侧：精致活力浅翠绿播放纽扣 */}
          <button
            onClick={handlePlayFeatured}
            className="relative z-10 w-10 h-10 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] text-neutral-950 flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer shadow-[0_2px_10px_rgba(30,215,96,0.28)]"
            title={isPlayingFeatured ? "暂停" : "播放"}
          >
            {isPlayingFeatured ? (
              <Pause size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" className="translate-x-[0.5px]" />
            )}
          </button>
        </div>

        {/* 卡片 2：每日 30 首 (梦幻紫罗兰与深邃靛蓝渐变背景，契合专属发现与探索) */}
        <Link
          href="/discover"
          className="snap-start shrink-0 w-[84%] max-w-[325px] rounded-2xl bg-gradient-to-br from-violet-50/90 via-indigo-50/30 to-white dark:from-violet-950/40 dark:via-[#1e192c] dark:to-[#14121a] p-3 text-neutral-900 dark:text-white border border-violet-200/70 dark:border-violet-500/20 flex items-center justify-between gap-2.5 h-[112px] relative overflow-hidden group shadow-[0_4px_16px_rgba(139,92,246,0.08)] dark:shadow-none"
        >
          {/* 背景环境柔光 */}
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-violet-400/20 dark:bg-violet-400/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-6 w-20 h-20 rounded-full bg-indigo-400/15 dark:bg-indigo-400/10 blur-xl pointer-events-none" />

          {/* 左侧：Daily 30 艺术唱片盒 */}
          <div className="relative z-10 w-16 h-16 rounded-xl bg-white/85 dark:bg-white/10 flex flex-col items-center justify-center shadow-sm shrink-0 border border-violet-200/60 dark:border-violet-500/20">
            <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest leading-none">
              DAILY
            </span>
            <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none mt-0.5">
              30
            </span>
          </div>

          {/* 中间：信息区域 */}
          <div className="min-w-0 flex-1 pl-1 relative z-10">
            <span className="inline-block text-[10px] font-semibold text-violet-700 dark:text-violet-300 bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/20 dark:border-violet-500/30 px-2 py-0.5 rounded-full mb-1">
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
          <div className="relative z-10 w-10 h-10 rounded-full bg-[#1ed760] text-neutral-950 flex items-center justify-center shrink-0 group-hover:scale-105 active:scale-90 transition-all shadow-[0_2px_10px_rgba(30,215,96,0.28)]">
            <Play size={15} fill="currentColor" className="translate-x-[0.5px]" />
          </div>
        </Link>

        {/* 卡片 3：华语热歌 TOP 50 (温暖琥珀与落日橙调渐变背景，契合巅峰榜单与高热度) */}
        <Link
          href="#featured-charts"
          className="snap-start shrink-0 w-[84%] max-w-[325px] rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/30 to-white dark:from-amber-950/40 dark:via-[#261c14] dark:to-[#171311] p-3 text-neutral-900 dark:text-white border border-amber-200/70 dark:border-amber-500/20 flex items-center justify-between gap-2.5 h-[112px] relative overflow-hidden group shadow-[0_4px_16px_rgba(245,158,11,0.08)] dark:shadow-none"
        >
          {/* 背景环境柔光 */}
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-amber-400/20 dark:bg-amber-400/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-6 w-20 h-20 rounded-full bg-orange-400/15 dark:bg-orange-400/10 blur-xl pointer-events-none" />

          {/* 左侧：TOP 50 徽章 */}
          <div className="relative z-10 w-16 h-16 rounded-xl bg-white/85 dark:bg-white/10 flex flex-col items-center justify-center shadow-sm shrink-0 border border-amber-200/60 dark:border-amber-500/20">
            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-none">
              HOT
            </span>
            <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none mt-0.5">
              50
            </span>
          </div>

          {/* 中间：信息区域 */}
          <div className="min-w-0 flex-1 pl-1 relative z-10">
            <span className="inline-block text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30 px-2 py-0.5 rounded-full mb-1">
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
          <div className="relative z-10 w-10 h-10 rounded-full bg-[#1ed760] text-neutral-950 flex items-center justify-center shrink-0 group-hover:scale-105 active:scale-90 transition-all shadow-[0_2px_10px_rgba(30,215,96,0.28)]">
            <Play size={15} fill="currentColor" className="translate-x-[0.5px]" />
          </div>
        </Link>
      </div>
    </div>
  );
}
