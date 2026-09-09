"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Play, Clock, Calendar, AlertCircle, Heart } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import type { Song, Album, Artist } from "@/types";
import SongRowItem from "@/components/SongRowItem";
import AlbumPageSkeleton from "@/components/AlbumPageSkeleton";
import { formatDuration } from "@/lib/utils";
import { useColor } from "color-thief-react";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";
import { motion } from "framer-motion";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

type AlbumDetails = Album & {
  songs: Song[];
  artists: Artist[];
  duration?: number;
  releaseDate?: string;
  description?: string;
};

const AlbumDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { playSong } = usePlayerStore();
  const { favoriteAlbumIds, toggleFavoriteAlbum } = useFavoritesStore();

  const isFavorited = id ? favoriteAlbumIds.has(Number(id)) : false;

  const [album, setAlbum] = useState<AlbumDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tParam = album?.title ? `&t=${encodeURIComponent(album.title)}` : "";
  const albumArtUrl = album?.coverPath
    ? getAuthenticatedSrc(album.coverPath)
    : id
    ? `${API_BASE_URL}/api/covers/${id}?size=600&key=${API_KEY}${tParam}`
    : "/placeholder.jpg";

  const { data: dominantColor } = useColor(albumArtUrl, "hex", {
    crossOrigin: "anonymous",
    quality: 10,
  });

  useEffect(() => {
    if (!id) return;

    const fetchAlbumData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient<AlbumDetails>(`/api/albums/${id}`);
        setAlbum(data);
      } catch (err) {
        console.error("Error loading album:", err);
        setError(err instanceof Error ? err.message : "Failed to load album");
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumData();
  }, [id]);

  const handlePlayAlbum = () => {
    if (album?.songs && album.songs.length > 0) {
      const queue = album.songs.map((song) => ({
        ...song,
        album: {
          id: album.id,
          title: album.title,
          artists: album.artists,
          coverPath: album.coverPath,
        },
      }));
      playSong(queue[0], queue);
    }
  };

  if (loading) return <AlbumPageSkeleton />;

  if (error || !album) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-neutral-400">
        <AlertCircle size={48} className="mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-white mb-2">Album Not Found</h2>
        <p className="mb-6">{error || "The requested album does not exist."}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-white transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const totalDuration = album.songs.reduce(
    (acc, song) => acc + (song.duration || 0),
    0
  );

  return (
    <div className="relative isolate min-h-screen pb-32">
      <div
        className="absolute inset-x-0 top-0 h-[400px] -z-10 transition-colors duration-700 ease-in-out"
        style={{
          background: `linear-gradient(to bottom, ${dominantColor || "#222"
            } 0%, #121212 100%)`,
          opacity: 0.6,
        }}
      />

      <div className="p-6 pt-10">
        <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
          <motion.div
            layoutId={`album-cover-${id}`}
            className="relative w-48 h-48 md:w-60 md:h-60 shadow-2xl flex-shrink-0 group rounded-md overflow-hidden"
            transition={{ duration: 0.3 }}
          >
            <Image
              src={albumArtUrl}
              alt={album.title}
              fill
              className="object-cover"
              priority
              unoptimized
              sizes="(max-width: 768px) 100vw, 300px"
            />
          </motion.div>

          <div className="flex flex-col gap-2 mb-2 w-full">
            <span className="text-sm font-bold uppercase tracking-wider text-white shadow-black drop-shadow-md">
              Album
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight mb-4 drop-shadow-lg">
              {album.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-200 font-medium">
              <div className="flex items-center gap-1">
                {album.artists.map((artist, i) => (
                  <span
                    key={artist.id}
                    className="text-white hover:underline cursor-pointer font-bold"
                  >
                    {artist.name}
                    {i < album.artists.length - 1 && ", "}
                  </span>
                ))}
              </div>
              <span className="text-neutral-400">•</span>
              <span>{album.songs.length} songs</span>
              <span className="text-neutral-400">•</span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {formatDuration(totalDuration)}
              </span>
              {album.releaseDate && (
                <>
                  <span className="text-neutral-400">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(album.releaseDate).getFullYear()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handlePlayAlbum}
            className="flex items-center justify-center w-14 h-14 bg-green-500 rounded-full shadow-lg hover:scale-105 hover:bg-green-400 transition-all active:scale-95"
          >
            <Play
              size={28}
              fill="black"
              className="translate-x-0.5 text-black"
            />
          </button>

          <button
            onClick={() => id && toggleFavoriteAlbum(Number(id))}
            className="group p-3 hover:scale-110 transition-all"
            aria-label={isFavorited ? "取消收藏" : "收藏专辑"}
          >
            <Heart
              size={32}
              className={`transition-colors ${isFavorited
                ? "fill-green-500 text-green-500"
                : "text-neutral-400 group-hover:text-white"
                }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-[24px_4fr_2fr_minmax(60px,auto)] gap-4 px-4 py-2 border-b border-white/10 text-neutral-400 text-sm mb-4 sticky top-16 bg-[#121212]/95 backdrop-blur-md z-10 rounded-t-md">
          <div className="text-right pr-2">#</div>{" "}
          <div>Title</div>
          <div className="hidden md:block">Album</div>
          <div className="flex justify-end pr-2">
            <Clock size={16} />
          </div>
        </div>

        <div className="flex flex-col">
          {album.songs.map((song, index) => {
            const songWithAlbum = {
              ...song,
              album: {
                id: album.id,
                title: album.title,
                artists: album.artists,
                coverPath: album.coverPath,
              },
            };

            const queueWithAlbum = album.songs.map((s) => ({
              ...s,
              album: {
                id: album.id,
                title: album.title,
                artists: album.artists,
                coverPath: album.coverPath,
              },
            }));

            return (
              <SongRowItem
                key={song.id}
                song={songWithAlbum}
                index={index}
                queue={queueWithAlbum}
                hideCover={true}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AlbumDetailPage;
