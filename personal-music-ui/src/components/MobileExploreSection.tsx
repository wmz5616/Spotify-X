"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Play, Pause } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { getAuthenticatedSrc, apiClient } from "@/lib/api-client";
import type { Song } from "@/types";

export type ExploreAlbum = {
  id: number;
  title: string;
  coverPath?: string | null;
  artists?: { id: number; name: string }[];
  songs?: Song[];
};

interface MobileExploreSectionProps {
  albums: ExploreAlbum[];
  hotSongs?: Song[];
}

export default function MobileExploreSection({
  albums = [],
  hotSongs = [],
}: MobileExploreSectionProps) {
  const { currentSong, isPlaying, playSong, togglePlayPause } = usePlayerStore();

  if (albums.length === 0 && hotSongs.length === 0) return null;

  // Extract unique popular artists from hot songs or albums
  const artistMap = new Map<string, { name: string; avatar: string; id?: number }>();
  for (const s of hotSongs) {
    if (s.artist && !artistMap.has(s.artist)) {
      const cover = s.album?.coverPath || (s.album?.artists?.[0] as any)?.avatarUrl || "";
      artistMap.set(s.artist, {
        name: s.artist,
        avatar: cover,
        id: (s.album?.artists?.[0] as any)?.id,
      });
    }
    if (artistMap.size >= 8) break;
  }

  const artistsList = Array.from(artistMap.values());

  const handlePlayAlbum = async (album: ExploreAlbum, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (currentSong?.album?.id === album.id) {
      togglePlayPause();
      return;
    }

    try {
      const full = await apiClient<ExploreAlbum & { songs: Song[] }>(`/api/albums/${album.id}`);
      if (full.songs && full.songs.length > 0) {
        playSong(full.songs[0], full.songs);
      }
    } catch {
      // fallback
    }
  };

  return (
    <div className="md:hidden space-y-6 mb-8 select-none">
      {/* 模块 1：精选歌单与专辑 (卡片横向滚动) */}
      {albums.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white tracking-tight">
              精选专辑 · 值得一听
            </h3>
            <Link
              href="/playlists"
              className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-0.5"
            >
              <span>更多</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="flex gap-3.5 overflow-x-auto no-scrollbar px-1 pb-1 -mx-1">
            {albums.slice(0, 8).map((alb) => {
              const isCurrent = currentSong?.album?.id === alb.id;
              const isAlbumPlaying = isCurrent && isPlaying;
              const coverUrl = alb.coverPath
                ? getAuthenticatedSrc(alb.coverPath, 200)
                : getAuthenticatedSrc(`api/covers/${alb.id}?size=200`, 200);

              return (
                <div
                  key={alb.id}
                  className="shrink-0 w-[116px] flex flex-col group cursor-pointer"
                >
                  <Link href={`/album/${alb.id}`} className="block">
                    {/* 封面 + 高级暗色磨砂播放角标 */}
                    <div className="relative w-[116px] h-[116px] rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/10 group-active:scale-95 transition-transform">
                      <Image
                        src={coverUrl}
                        alt={alb.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        onClick={(e) => handlePlayAlbum(alb, e)}
                        className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/75 backdrop-blur-md text-white flex items-center justify-center shadow-sm active:scale-90 transition-transform cursor-pointer"
                        title="播放专辑"
                      >
                        {isAlbumPlaying ? (
                          <Pause size={12} fill="white" />
                        ) : (
                          <Play size={12} fill="white" className="translate-x-[0.5px]" />
                        )}
                      </button>
                    </div>

                    {/* 标题 & 歌手 */}
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate mt-2 leading-tight">
                      {alb.title}
                    </h4>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                      {alb.artists?.[0]?.name || "精选热碟"}
                    </p>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 模块 2：人气音乐人 (圆头像横向滚动) */}
      {artistsList.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white tracking-tight">
              热门歌手 · 畅听代表作
            </h3>
            <Link
              href="/discover"
              className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-0.5"
            >
              <span>发现</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto no-scrollbar px-1 pb-1 -mx-1">
            {artistsList.map((artist) => {
              const avatar = artist.avatar
                ? getAuthenticatedSrc(artist.avatar, 150)
                : "/placeholder.jpg";

              return (
                <Link
                  key={artist.name}
                  href={artist.id ? `/artist/${artist.id}` : `/search?q=${encodeURIComponent(artist.name)}`}
                  className="shrink-0 flex flex-col items-center w-16 group active:scale-95 transition-transform"
                >
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/10 group-hover:ring-2 group-hover:ring-emerald-500/40 transition-all">
                    <Image
                      src={avatar}
                      alt={artist.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate mt-1.5 text-center w-full">
                    {artist.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
