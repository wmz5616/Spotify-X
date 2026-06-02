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

import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  const { isSongFavorited, toggleFavoriteSong } = useFavoritesStore();
  const { isAuthenticated } = useUserStore();
  const { addToast } = useToastStore();

  const isCurrentSong = song.id === currentSong?.id;
  const isFavorited = isSongFavorited(song.id);
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
    const pathWithPublic = path.startsWith("/public") ? path : `/public${path}`;
    return getAuthenticatedSrc(pathWithPublic);
  };

  const coverUrl = getCoverUrl(song.album?.coverPath);

  return (
    <SongContextMenu song={song}>
      <div
        style={style}
        className={clsx(
          "group grid grid-cols-[24px_4fr_2fr_minmax(60px,auto)] gap-4 px-4 py-2 text-sm text-neutral-400 hover:bg-neutral-800/50 rounded-md transition cursor-default items-center relative select-none",
          isCurrentSong && "bg-neutral-800/30"
        )}
        onDoubleClick={() => playSong(song, queue)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center justify-end w-full relative min-h-[16px]">
          {!isHovered && !isCurrentSong && (
            <span className="font-medium tabular-nums text-neutral-400">
              {index + 1}
            </span>
          )}

          {!isHovered && isCurrentSong && isPlaying && (
            <span className="text-green-500 animate-pulse">
              <BarChart3 size={16} />
            </span>
          )}

          {!isHovered && isCurrentSong && !isPlaying && (
            <span className="text-green-500 font-medium tabular-nums">
              {index + 1}
            </span>
          )}

          {isHovered && (
            <button
              onClick={handlePlayClick}
              className="text-white hover:scale-110 transition-transform flex items-center justify-center"
            >
              {isCurrentSong && isPlaying ? (
                <Pause size={16} fill="white" />
              ) : (
                <Play size={16} fill="white" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 overflow-hidden">
          {!hideCover && (
            <div className="relative h-10 w-10 min-w-[40px] overflow-hidden rounded shadow-sm flex-shrink-0">
              <Image
                src={coverUrl}
                fill
                alt={song.title}
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="flex flex-col overflow-hidden">
            <span
              className={clsx(
                "truncate font-medium text-[15px] pr-2",
                isCurrentSong ? "text-green-500" : "text-white"
              )}
            >
              {cleanSongTitle(song.title, song.album?.artists || song.artist)}
            </span>
            <div className="flex items-center gap-1 text-sm text-neutral-400 group-hover:text-white transition-colors truncate">
              <div className="flex truncate">
                {song.album?.artists && song.album.artists.length > 0 ? (
                  song.album.artists.map((artist, i) => (
                    <React.Fragment key={artist.id}>
                      <Link
                        href={`/artist/${encodeURIComponent(artist.name)}`}
                        className="hover:underline transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {artist.name}
                      </Link>
                      {i < (song.album?.artists?.length || 0) - 1 && (
                        <span className="mr-1">,</span>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <span>{song.artist || "Unknown Artist"}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:block truncate hover:text-white transition-colors text-sm pr-4">
          <Link
            href={`/album/${song.album?.id}`}
            className="hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {song.album?.title || "Unknown Album"}
          </Link>
        </div>

        <div className="flex items-center justify-end gap-4 pl-2 pr-2">
          <LikeButton
            isLiked={isFavorited}
            onToggle={handleToggleFavorite}
            size={16}
            className={clsx(!isFavorited && "invisible group-hover:visible")}
          />

          <div className="text-sm font-variant-numeric tabular-nums w-10 text-right">
            {formatDuration(song.duration)}
          </div>
        </div>
      </div>
    </SongContextMenu>
  );
};

export default SongRowItem;
