"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Mic2 } from "lucide-react";
import type { Artist } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ArtistSearchResultItemProps {
  artist: Artist;
}

const ArtistSearchResultItem: React.FC<ArtistSearchResultItemProps> = ({
  artist,
}) => {
  const imageUrl = artist.avatarUrl
    ? `${API_BASE_URL}/public${artist.avatarUrl}`
    : null;

  return (
    <Link
      href={`/artist/${encodeURIComponent(artist.name)}`}
      className="group relative flex flex-col items-center gap-4 p-4 rounded-md bg-neutral-900/40 hover:bg-neutral-800 transition overflow-hidden"
    >
      <div className="relative w-32 h-32 rounded-full shadow-lg overflow-hidden bg-neutral-800 group-hover:scale-105 transition-transform duration-300">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={artist.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Mic2 size={48} className="text-neutral-500" />
          </div>
        )}
      </div>
      <div className="flex flex-col items-center text-center">
        <h3 className="font-bold truncate w-full px-2" title={artist.name}>
          {artist.name}
        </h3>
        <span className="text-sm text-neutral-400 mt-1 rounded-full bg-black/20 px-3 py-1">
          Artist
        </span>
      </div>
    </Link>
  );
};

export default ArtistSearchResultItem;
