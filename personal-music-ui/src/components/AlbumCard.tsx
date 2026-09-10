"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Play, Pause, LoaderCircle } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import type { Song } from "@/types";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";
import { motion } from "framer-motion";

type AlbumForCard = {
  id: number;
  title: string;
  coverPath?: string | null;
  artists?: {
    id: number;
    name: string;
  }[];
  _count?: {
    songs: number;
  };
};

type AlbumWithSongs = AlbumForCard & {
  songs: Song[];
};

const AlbumCard = ({ album, priority = false }: { album: AlbumForCard, priority?: boolean }) => {
  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayerStore();
  const [isLoading, setIsLoading] = useState(false);

  const isCurrentAlbum = currentSong?.album?.id === album.id;
  const isCurrentPlaying = isCurrentAlbum && isPlaying;

  const getCoverUrl = () => {
    if (album.coverPath) {
      return getAuthenticatedSrc(album.coverPath, 300);
    }
    if (album.id) {
      const tParam = album.title ? `&t=${encodeURIComponent(album.title)}` : "";
      return getAuthenticatedSrc(`api/covers/${album.id}?size=300${tParam}`, 300);
    }
    return "/placeholder.jpg";
  };

  const albumArtUrl = getCoverUrl();

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isCurrentAlbum) {
      togglePlayPause();
      return;
    }

    setIsLoading(true);

    try {
      const fullAlbum = await apiClient<AlbumWithSongs>(
        `/api/albums/${album.id}`
      );

      if (fullAlbum && fullAlbum.songs && fullAlbum.songs.length > 0) {
        const artistNames =
          fullAlbum.artists?.map((a) => a.name).join(", ") || "";

        const queue = fullAlbum.songs.map((song) => ({
          ...song,
          artist: artistNames,
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
    <div className="group relative block h-full bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1 border border-white/5 hover:border-white/10">
      <Link
        href={`/album/${album.id}`}
        className="block relative aspect-square w-full mb-4 rounded-md shadow-lg overflow-hidden bg-neutral-800"
      >
        <motion.div
          className="w-full h-full relative"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <Image
            src={albumArtUrl}
            alt={`Cover for ${album.title}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out"
            unoptimized
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
            priority={priority}
          />
        </motion.div>
      </Link>

      <div className="flex flex-col gap-1">
        <Link href={`/album/${album.id}`} className="block w-fit max-w-full">
          <h3
            className="font-bold truncate text-white hover:underline"
            title={album.title}
          >
            {album.title}
          </h3>
        </Link>

        <div className="text-sm text-[#a7a7a7] truncate font-medium relative z-10 h-5">
          {album.artists && album.artists.length > 0 ? (
            album.artists.map((artist, i) => (
              <React.Fragment key={artist.id}>
                <Link
                  href={artist.id ? `/artist/${encodeURIComponent(artist.name)}?id=${artist.id}` : `/artist/${encodeURIComponent(artist.name)}`}
                  className="hover:underline hover:text-white transition-colors"
                >
                  {artist.name}
                </Link>
                {i < (album.artists?.length || 0) - 1 && ", "}
              </React.Fragment>
            ))
          ) : (
            <span>Unknown Artist</span>
          )}
        </div>
      </div>

      <button
        onClick={handlePlayClick}
        disabled={isLoading}
        className={`absolute bottom-[100px] right-5 flex items-center justify-center bg-green-500 w-12 h-12 rounded-full shadow-[0_8px_20px_rgba(34,197,94,0.45)] hover:shadow-[0_8px_25px_rgba(34,197,94,0.7)] 
                   transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-20
                   focus:outline-none hover:scale-105 hover:bg-green-400 active:scale-95 cursor-pointer ${
                     isCurrentPlaying
                       ? "opacity-100 translate-y-0 scale-100"
                       : "opacity-0 translate-y-2 scale-85 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100"
                   }`}
        aria-label={isCurrentPlaying ? `Pause ${album.title}` : `Play ${album.title}`}
      >
        {isLoading ? (
          <LoaderCircle className="animate-spin text-black" size={24} />
        ) : isCurrentPlaying ? (
          <Pause fill="black" className="text-black" size={22} />
        ) : (
          <Play fill="black" className="text-black translate-x-0.5" size={24} />
        )}
      </button>
    </div>
  );
};

export default React.memo(AlbumCard);
