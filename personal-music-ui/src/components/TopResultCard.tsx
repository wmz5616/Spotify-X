"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Play, LoaderCircle } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import type { Artist, Song, Album } from "@/types";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface TopResultProps {
  result: Artist | (Album & { songs?: Song[] }) | null;
  type: "artist" | "album";
}

const TopResultCard = ({ result, type }: TopResultProps) => {
  const { playSong } = usePlayerStore();
  const [isLoading, setIsLoading] = useState(false);

  if (!result) return null;

  const isArtist = type === "artist";
  const href = isArtist 
    ? `/artist/${encodeURIComponent((result as Artist).name)}` 
    : `/album/${result.id}`;

  let imageUrl = "/placeholder.jpg";

  if (isArtist) {
    const artist = result as Artist;
    if (artist.avatarUrl) {
      const path = artist.avatarUrl.startsWith("/public")
        ? artist.avatarUrl
        : `/public${artist.avatarUrl}`;
      imageUrl = getAuthenticatedSrc(path);
    }
  } else {
    const album = result as Album;
    if (album.coverPath) {
      const path = album.coverPath.startsWith("/public")
        ? album.coverPath
        : `/public${album.coverPath}`;
      imageUrl = getAuthenticatedSrc(path);
    }
  }

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isArtist) {
        const artistDetails = await apiClient<
          Artist & { albums: (Album & { songs: Song[] })[] }
        >(`/api/artists/${result.id}`);
        const allSongs =
          artistDetails.albums?.flatMap((a) =>
            a.songs.map((s) => ({ ...s, album: a }))
          ) || [];

        if (allSongs.length > 0) {
          playSong(allSongs[0], allSongs);
        }
      } else {
        const albumDetails = await apiClient<Album & { songs: Song[] }>(
          `/api/albums/${result.id}`
        );
        if (albumDetails.songs && albumDetails.songs.length > 0) {
          const queue = albumDetails.songs.map((s) => ({
            ...s,
            album: albumDetails,
          }));
          playSong(queue[0], queue);
        }
      }
    } catch (error) {
      console.error("Play failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = isArtist
    ? (result as Artist).name
    : (result as Album).title;

  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-4 bg-[#181818] hover:bg-[#282828] p-5 rounded-lg transition-colors duration-300 w-full h-full min-h-[220px]"
    >
      <div className="relative">
        <div
          className={cn(
            "relative w-24 h-24 shadow-lg mb-2 bg-[#282828]",
            isArtist
              ? "rounded-full overflow-hidden"
              : "rounded-md overflow-hidden"
          )}
        >
          <Image
            src={imageUrl}
            alt={displayName}
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="absolute bottom-0 right-0 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 shadow-xl z-20">
          <button
            onClick={handlePlay}
            disabled={isLoading}
            className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center hover:scale-105 hover:bg-green-400 shadow-md transition-transform"
          >
            {isLoading ? (
              <LoaderCircle size={24} className="text-black animate-spin" />
            ) : (
              <Play
                size={24}
                className="text-black translate-x-0.5"
                fill="black"
              />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 mt-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight line-clamp-1">
          {displayName}
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-bold tracking-wider uppercase bg-[#121212]/60 text-white px-3 py-1 rounded-full">
            {type}
          </span>
          {!isArtist && (result as Album).artists && (
            <div className="text-sm text-neutral-400 font-medium flex gap-1 items-center">
              {(result as Album).artists.map((a, i) => (
                <React.Fragment key={a.id}>
                  <Link
                    href={`/artist/${encodeURIComponent(a.name)}`}
                    className="hover:underline hover:text-white transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {a.name}
                  </Link>
                  {i < ((result as Album).artists?.length || 0) - 1 && ", "}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default TopResultCard;
