"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Play, TvMinimalPlay, Film, Mic2 } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { getAuthenticatedSrc } from "@/lib/api-client";
import MvPlayerModal from "@/components/MvPlayerModal";

interface VideoItem {
  id: string;
  title: string;
  artist: string;
  cover: string;
  durationStr: string;
  views: string;
  tag: string;
}

const FEATURED_VIDEOS: VideoItem[] = [
  {
    id: "v1",
    title: "晴天 (Official Music Video)",
    artist: "周杰伦",
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
    durationStr: "04:29",
    views: "1.2亿",
    tag: "官方MV",
  },
  {
    id: "v2",
    title: "Die With A Smile (Live Performance)",
    artist: "Lady Gaga, Bruno Mars",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80",
    durationStr: "04:12",
    views: "8,650万",
    tag: "现场舞台",
  },
  {
    id: "v3",
    title: "Cruel Summer (Official Video)",
    artist: "Taylor Swift",
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
    durationStr: "03:58",
    views: "9,420万",
    tag: "4K超清",
  },
  {
    id: "v4",
    title: "孤勇者 (英雄联盟：双城之战中文主题曲)",
    artist: "陈奕迅",
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&fit=crop&q=80",
    durationStr: "04:16",
    views: "2.3亿",
    tag: "官方MV",
  },
  {
    id: "v5",
    title: "修炼爱情 (Official Music Video)",
    artist: "林俊杰",
    cover: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80",
    durationStr: "05:43",
    views: "6,800万",
    tag: "官方MV",
  },
  {
    id: "v6",
    title: "爱人错过 (Live Edition)",
    artist: "告五人",
    cover: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80",
    durationStr: "04:52",
    views: "4,500万",
    tag: "现场舞台",
  },
];

const CATEGORIES = ["全部", "官方MV", "现场舞台", "4K超清"];

export default function VideoPage() {
  const { currentSong } = usePlayerStore();
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [activeMv, setActiveMv] = useState<{
    isOpen: boolean;
    songTitle?: string;
    artistName?: string;
    duration?: number;
  }>({
    isOpen: false,
  });

  const handlePlayVideo = (songTitle: string, artistName: string, duration?: number) => {
    setActiveMv({
      isOpen: true,
      songTitle,
      artistName,
      duration,
    });
  };

  const filteredVideos =
    selectedCategory === "全部"
      ? FEATURED_VIDEOS
      : FEATURED_VIDEOS.filter((v) => v.tag === selectedCategory);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 select-none">
      {/* 顶部标题与分类胶囊 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TvMinimalPlay className="text-[#1ed760]" size={22} />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              视频专区
            </h1>
          </div>
          <span className="text-xs text-neutral-400">官方 MV · 舞台 Live</span>
        </div>

        {/* 分类筛选器 */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 active:scale-95 ${
                selectedCategory === cat
                  ? "bg-white text-black font-bold shadow-md"
                  : "bg-[#1f1f22] text-neutral-300 hover:bg-[#28282b] border border-white/5"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 当前正在收听歌曲的专属 MV 卡片 */}
      {currentSong && (
        <div
          onClick={() =>
            handlePlayVideo(
              currentSong.title,
              currentSong.artist,
              currentSong.duration
            )
          }
          className="bg-gradient-to-r from-[#1c1d22] to-[#141416] border border-white/10 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-white/20 transition-all active:scale-[0.99] group shadow-lg"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-neutral-800 shrink-0 border border-white/10">
              <Image
                src={getAuthenticatedSrc(currentSong.album?.coverPath || "/placeholder.jpg")}
                alt={currentSong.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Play size={20} className="text-white fill-white ml-0.5" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center bg-[#1ed760]/10 text-[#1ed760] text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1">
                <span>当前收听歌曲 MV</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                {currentSong.title}
              </h3>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                {currentSong.artist}
              </p>
            </div>
          </div>

          <button className="bg-white hover:bg-neutral-200 text-black text-xs font-bold px-3.5 py-1.5 rounded-full shrink-0 ml-3 transition-colors active:scale-95 flex items-center gap-1">
            <Play size={12} className="fill-current" />
            <span className="hidden sm:inline">观看 MV</span>
          </button>
        </div>
      )}

      {/* 推荐视频网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVideos.map((item) => (
          <div
            key={item.id}
            onClick={() => handlePlayVideo(item.title, item.artist)}
            className="bg-[#18181a] hover:bg-[#202024] border border-white/5 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 flex flex-col active:scale-[0.98]"
          >
            {/* 封面视频容器 */}
            <div className="relative aspect-video w-full bg-neutral-900 overflow-hidden">
              <Image
                src={item.cover}
                alt={item.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {/* 遮罩与播放图标 */}
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-md group-hover:scale-110 group-hover:bg-[#1ed760] group-hover:text-black group-hover:border-transparent transition-all">
                  <Play size={18} className="fill-current ml-0.5" />
                </div>
              </div>

              {/* 标签与时长 */}
              <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-white font-medium border border-white/10">
                {item.tag}
              </div>
              <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-neutral-200 font-mono">
                {item.durationStr}
              </div>
            </div>

            {/* 视频信息 */}
            <div className="p-3.5 flex flex-col justify-between flex-1">
              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-[#1ed760] transition-colors line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-1">
                  {item.artist}
                </p>
              </div>
              <div className="text-[11px] text-neutral-500 mt-2 flex items-center gap-2">
                <span>{item.views} 次观看</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MV 弹窗播放器 */}
      <MvPlayerModal
        isOpen={activeMv.isOpen}
        onClose={() => setActiveMv((prev) => ({ ...prev, isOpen: false }))}
        songTitle={activeMv.songTitle}
        artistName={activeMv.artistName}
        duration={activeMv.duration}
      />
    </div>
  );
}
