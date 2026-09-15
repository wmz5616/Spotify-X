"use client";

import { usePlayerStore } from "@/store/usePlayerStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { useUserStore } from "@/store/useUserStore";
import { useToastStore } from "@/store/useToastStore";
import type { Song } from "@/types";
import { formatDuration, cleanSongTitle } from "@/lib/utils";
import { Play, Pause, BarChart3, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import clsx from "clsx";
import SongContextMenu from "./SongContextMenu";
import LikeButton from "./LikeButton";

import { getAuthenticatedSrc } from "@/lib/api-client";

interface SongRowItemProps {
  song: Song;
  index: number;
  queue?: Song[];
  hideCover?: boolean;
  style?: React.CSSProperties;
}

const SongRowItem = ({
  song,
  index,
  queue,
  hideCover = false,
  style,
}: SongRowItemProps) => {
  const { playSong, togglePlayPause, currentSong, isPlaying } =
    usePlayerStore();
  const isFavorited = useFavoritesStore((state) => state.favoriteSongIds.has(song.id));
  const toggleFavoriteSong = useFavoritesStore((state) => state.toggleFavoriteSong);
  const { isAuthenticated } = useUserStore();
  const { addToast } = useToastStore();

  const isCurrentSong = song.id === currentSong?.id;
  const [isHovered, setIsHovered] = useState(false);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentSong) {
      togglePlayPause();
    } else {
      playSong(song, queue);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      addToast("请先登录");
      return;
    }
    const success = await toggleFavoriteSong(song.id);
    if (success) {
      addToast(isFavorited ? "已取消收藏" : "已添加到收藏");
    }
  };

  const getCoverUrl = (path: string | null | undefined) => {
    if (!path) return "/placeholder.jpg";
    return getAuthenticatedSrc(path, 100);
  };

  const coverUrl = getCoverUrl(song.album?.coverPath);

  return (
    <SongContextMenu song={song}>
      <div
        style={style}
        onClick={handlePlayClick}
        onDoubleClick={() => playSong(song, queue)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={clsx(
          "group flex md:grid md:grid-cols-[28px_4fr_2fr_minmax(60px,auto)] justify-between items-center gap-2.5 md:gap-4 px-2.5 md:px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100/80 dark:hover:bg-white/5 active:bg-neutral-200/60 dark:active:bg-white/10 rounded-xl transition cursor-pointer md:cursor-default relative select-none",
          isCurrentSong ? "bg-emerald-500/10 dark:bg-emerald-500/10" : ""
        )}
      >
        <div className="flex items-center justify-center md:justify-end w-6 md:w-full shrink-0 relative min-h-[16px]">
          {!isHovered && !isCurrentSong && (
            <span
              className={clsx(
                "font-bold tabular-nums text-xs md:text-sm transition-colors",
                index === 0
                  ? "text-rose-500 font-extrabold"
                  : index === 1
                  ? "text-amber-500 font-extrabold"
                  : index === 2
                  ? "text-amber-600 dark:text-amber-400 font-extrabold"
                  : "text-neutral-400 dark:text-neutral-500 font-medium"
              )}
            >
              {index + 1}
            </span>
          )}

          {!isHovered && isCurrentSong && isPlaying && (
            <span className="text-[#1ed760] animate-pulse">
              <BarChart3 size={16} />
            </span>
          )}

          {!isHovered && isCurrentSong && !isPlaying && (
            <span className="text-[#1ed760] font-bold tabular-nums text-xs md:text-sm">
              {index + 1}
            </span>
          )}

          {isHovered && (
            <button
              onClick={handlePlayClick}
              className="text-neutral-800 dark:text-white hover:scale-110 transition-transform flex items-center justify-center"
            >
              {isCurrentSong && isPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 md:gap-3 overflow-hidden min-w-0 flex-1">
          {!hideCover && (
            <div className="relative h-10 w-10 min-w-[40px] overflow-hidden rounded-lg shadow-sm flex-shrink-0 bg-neutral-100 dark:bg-neutral-800 border border-black/5 dark:border-white/5">
              <Image
                src={coverUrl}
                fill
                alt={song.title}
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="flex flex-col overflow-hidden min-w-0 flex-1">
            <span
              className={clsx(
                "truncate font-medium text-sm md:text-[15px] pr-2 transition-colors",
                isCurrentSong ? "text-[#1ed760] font-bold" : "text-neutral-900 dark:text-white"
              )}
            >
              {cleanSongTitle(song.title, song.artist || song.album?.artists)}
            </span>
            <div className="flex items-center gap-1 text-xs md:text-sm text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors truncate">
              <div className="flex truncate">
                {(() => {
                  const rawArtist = song.artist?.trim();
                  if (rawArtist) {
                    const names = rawArtist.split(/\s*[/,&、]\s*/).filter(Boolean);
                    if (names.length > 0) {
                      return names.map((name, i) => {
                        const matchingArtist = song.album?.artists?.find(
                          (a) => a.name.toLowerCase() === name.toLowerCase()
                        );
                        const href = matchingArtist?.id
                          ? `/artist/${encodeURIComponent(matchingArtist.name)}?id=${matchingArtist.id}`
                          : `/artist/${encodeURIComponent(name)}`;

                        return (
                          <React.Fragment key={name + i}>
                            <Link
                              href={href}
                              className="hover:underline hover:text-neutral-900 dark:hover:text-white transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {name}
                            </Link>
                            {i < names.length - 1 && <span className="mr-1">,</span>}
                          </React.Fragment>
                        );
                      });
                    }
                  }

                  const albumArtists = song.album?.artists;
                  if (albumArtists && albumArtists.length > 0) {
                    return albumArtists.map((artist, i) => (
                      <React.Fragment key={artist.id || i}>
                        <Link
                          href={artist.id ? `/artist/${encodeURIComponent(artist.name)}?id=${artist.id}` : `/artist/${encodeURIComponent(artist.name)}`}
                          className="hover:underline hover:text-neutral-900 dark:hover:text-white transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {artist.name}
                        </Link>
                        {i < albumArtists.length - 1 && (
                          <span className="mr-1">,</span>
                        )}
                      </React.Fragment>
                    ));
                  }

                  return <span>{song.artist || "未知歌手"}</span>;
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:block truncate text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors text-sm pr-4">
          <Link
            href={`/album/${song.album?.id}`}
            className="hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {song.album?.title || "Unknown Album"}
          </Link>
        </div>

        <div className="flex items-center justify-end gap-2.5 md:gap-4 pl-2 pr-1 md:pr-2 shrink-0">
          <LikeButton
            isLiked={isFavorited}
            onToggle={handleToggleFavorite}
            size={17}
            className={clsx(!isFavorited && "opacity-60 md:opacity-0 group-hover:opacity-100 hover:opacity-100")}
          />

          <div className="text-xs md:text-sm font-variant-numeric tabular-nums w-10 text-right text-neutral-400 dark:text-neutral-500">
            {formatDuration(song.duration)}
          </div>
        </div>
      </div>
    </SongContextMenu>
  );
};

export default React.memo(SongRowItem);
