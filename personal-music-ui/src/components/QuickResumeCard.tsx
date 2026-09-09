"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Play, LoaderCircle } from "lucide-react";
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
  const { playSong } = usePlayerStore();
  const [isLoading, setIsLoading] = useState(false);
  const tParam = album.title ? `&t=${encodeURIComponent(album.title)}` : "";
  const coverUrl = album.coverPath
    ? getAuthenticatedSrc(album.coverPath)
    : getAuthenticatedSrc(`api/covers/${album.id}?size=128${tParam}`);

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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
      className="group relative flex items-center h-16 md:h-20 bg-neutral-800/40 hover:bg-neutral-800/80 backdrop-blur-md rounded-md overflow-hidden transition-all duration-300 pr-4 hover:shadow-xl hover:-translate-y-1 border border-white/5"
    >
      <div className="relative h-full aspect-square flex-shrink-0 shadow-lg mr-4">
        <Image
          src={coverUrl}
          alt={album.title}
          fill
          className="object-cover"
          unoptimized
          priority={priority}
        />
      </div>

      <span className="font-bold text-white text-sm md:text-base line-clamp-2 flex-grow pr-8">
        {album.title}
      </span>

      <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-xl rounded-full">
        <button
          onClick={handlePlayClick}
          disabled={isLoading}
          className="w-10 h-10 md:w-12 md:h-12 bg-green-500 rounded-full flex items-center justify-center hover:scale-105 hover:bg-green-400 active:scale-95 transition-transform shadow-md"
        >
          {isLoading ? (
            <LoaderCircle size={20} className="text-black animate-spin" />
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

export default QuickResumeCard;
