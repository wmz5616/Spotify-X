"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Play, LoaderCircle } from "lucide-react";
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
  const { playSong } = usePlayerStore();
  const [isLoading, setIsLoading] = useState(false);

  const getCoverUrl = () => {
    if (album.id) {
      const tParam = album.title ? `&t=${encodeURIComponent(album.title)}` : "";
      return getAuthenticatedSrc(`api/covers/${album.id}?size=300${tParam}`);
    }
    return "/placeholder.jpg";
  };

  const albumArtUrl = getCoverUrl();

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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
    <div className="group relative block h-full bg-[#181818]/60 backdrop-blur-md p-4 rounded-md hover:bg-[#282828]/80 transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1 border border-white/5 hover:border-white/10">
      <Link
        href={`/album/${album.id}`}
        className="block relative aspect-square w-full mb-4 rounded-md shadow-lg overflow-hidden"
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
                  href={`/artist/${encodeURIComponent(artist.name)}`}
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
        className="absolute bottom-[100px] right-6 flex items-center justify-center bg-green-500 p-3 rounded-full shadow-lg 
                   opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 
                   transition-all duration-300 ease-in-out z-20
                   focus:outline-none hover:scale-110 hover:bg-green-400 active:scale-95"
        aria-label={`Play ${album.title}`}
      >
        {isLoading ? (
          <LoaderCircle className="animate-spin text-black" size={24} />
        ) : (
          <Play fill="black" className="text-black translate-x-0.5" size={24} />
        )}
      </button>
    </div>
  );
};

export default AlbumCard;
