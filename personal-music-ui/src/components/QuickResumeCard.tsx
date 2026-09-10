"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Play, Pause, LoaderCircle } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import type { Song } from "@/types";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";

type AlbumForResume = {
  id: number;
  title: string;
  coverPath?: string | null;
  artists?: {
    id: number;
    name: string;
  }[];
};

type AlbumWithSongs = AlbumForResume & { songs: Song[] };

const QuickResumeCard = ({ album, priority = false }: { album: AlbumForResume, priority?: boolean }) => {
  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayerStore();
  const [isLoading, setIsLoading] = useState(false);

  const isCurrentAlbum = currentSong?.album?.id === album.id;
  const isCurrentPlaying = isCurrentAlbum && isPlaying;

  const tParam = album.title ? `&t=${encodeURIComponent(album.title)}` : "";
  const coverUrl = album.coverPath
    ? getAuthenticatedSrc(album.coverPath, 150)
    : getAuthenticatedSrc(`api/covers/${album.id}?size=128${tParam}`);

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // If this album is already loaded in player, simply toggle play/pause
    if (isCurrentAlbum) {
      togglePlayPause();
      return;
    }

    setIsLoading(true);

    try {
      const fullAlbum = await apiClient<AlbumWithSongs>(
        `/api/albums/${album.id}`
      );
      if (fullAlbum?.songs?.length > 0) {
        const queue = fullAlbum.songs.map((song) => ({
          ...song,
          album: {
            id: fullAlbum.id,
            title: fullAlbum.title,
            artists: fullAlbum.artists || [],
            coverPath: fullAlbum.coverPath,
          },
        }));
        playSong(queue[0], queue);
      }
    } catch (error) {
      console.error("Failed to play album:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Link
      href={`/album/${album.id}`}
      className={`group relative flex items-center h-16 md:h-20 rounded-lg overflow-hidden transition-all duration-300 pr-4 hover:-translate-y-1 backdrop-blur-md border select-none ${
        isCurrentPlaying
          ? "bg-white/[0.12] border-green-500/40 shadow-[0_6px_24px_rgba(34,197,94,0.16),inset_0_1px_0_rgba(255,255,255,0.2)]"
          : "bg-white/[0.06] hover:bg-white/[0.14] border-white/10 hover:border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:shadow-2xl hover:shadow-black/50"
      }`}
    >
      <div className="relative h-full aspect-square flex-shrink-0 shadow-lg mr-3 md:mr-4 overflow-hidden bg-neutral-800">
        <Image
          src={coverUrl}
          alt={album.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          unoptimized
          priority={priority}
        />
        {isCurrentPlaying && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex items-end gap-0.5 h-3.5">
              <span className="w-1 bg-green-400 rounded-full animate-bar-1" />
              <span className="w-1 bg-green-400 rounded-full animate-bar-2" />
              <span className="w-1 bg-green-400 rounded-full animate-bar-3" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col justify-center flex-grow pr-10 overflow-hidden">
        <span
          className={`font-bold text-sm md:text-base line-clamp-2 transition-colors ${
            isCurrentPlaying ? "text-green-400" : "text-white group-hover:text-white"
          }`}
        >
          {album.title}
        </span>
      </div>

      <div
        className={`absolute right-3 md:right-4 z-20 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isCurrentPlaying
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-85 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100"
        }`}
      >
        <button
          onClick={handlePlayClick}
          disabled={isLoading}
          aria-label={isCurrentPlaying ? "暂停" : "播放"}
          className="w-10 h-10 md:w-11 md:h-11 bg-green-500 hover:bg-green-400 active:scale-95 text-black rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(34,197,94,0.45)] hover:shadow-[0_8px_25px_rgba(34,197,94,0.7)] transition-all cursor-pointer"
        >
          {isLoading ? (
            <LoaderCircle size={20} className="text-black animate-spin" />
          ) : isCurrentPlaying ? (
            <Pause size={20} className="text-black" fill="black" />
          ) : (
            <Play
              size={20}
              className="text-black translate-x-0.5"
              fill="black"
            />
          )}
        </button>
      </div>
    </Link>
  );
};

export default React.memo(QuickResumeCard);

