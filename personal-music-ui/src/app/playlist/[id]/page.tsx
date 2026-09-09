"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useUserStore } from "@/store/useUserStore";
import type { Playlist, Song } from "@/types";
import { Clock, Play, AlertCircle, Music } from "lucide-react";
import SongRowItem from "@/components/SongRowItem";
import { FixedSizeList as List } from "react-window";
import PlaylistCoverUpload from "@/components/PlaylistCoverUpload";
import { getAuthenticatedSrc } from "@/lib/api-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type PlaylistDetails = Playlist & {
  coverPath?: string | null;
  songs: (Song & {
    album: {
      id: number;
      title: string;
      artists: { id: number; name: string }[];
      coverPath: string;
    };
  })[];
};

const PlaylistDetailPage = () => {
  const params = useParams();
  const id = params.id as string;

  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null);
  const { playSong } = usePlayerStore();
  const { token, isAuthenticated } = useUserStore();
  const [listHeight, setListHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) return;
    const fetchPlaylistData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/user-playlists/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        const data = await response.json();
        setPlaylist(data);
      } catch (error) {
        console.error("Failed to fetch playlist details:", error);
        setError("无法加载歌单");
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylistData();
  }, [id, token]);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const top = containerRef.current.getBoundingClientRect().top;
        const height = window.innerHeight - top - 20;
        setListHeight(Math.max(300, height));
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [playlist]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-neutral-400">Loading playlist...</p>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-400">
        <AlertCircle size={48} className="mb-4 text-red-500" />
        <p>{error || "歌单不存在"}</p>
      </div>
    );
  }

  const handlePlayPlaylist = () => {
    if (playlist.songs && playlist.songs.length > 0) {
      playSong(playlist.songs[0], playlist.songs);
    }
  };

  const coverArtUrl =
    playlist.songs.length > 0 && playlist.songs[0].album.coverPath
      ? getAuthenticatedSrc(playlist.songs[0].album.coverPath)
      : "/placeholder.jpg";

  return (
    <div className="relative h-full flex flex-col">
      <div className="p-8 pb-4 flex-shrink-0">
        <header className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8 pt-8">
          <PlaylistCoverUpload
            playlistId={Number(id)}
            currentCoverPath={playlist.coverPath}
            onCoverChange={(newPath) => {
              setPlaylist((prev) => prev ? { ...prev, coverPath: newPath } : null);
            }}
          />
          <div className="flex flex-col gap-3 text-center md:text-left">
            <span className="text-sm font-bold">PLAYLIST</span>
            <h1 className="text-5xl lg:text-8xl font-black tracking-tighter break-words">
              {playlist.name}
            </h1>
            <p className="text-neutral-400 mt-2">
              {playlist.songs.length} songs
            </p>
          </div>
        </header>

        <div className="flex items-center gap-6 mb-6">
          <button
            onClick={handlePlayPlaylist}
            className="bg-green-500 text-black p-4 rounded-full shadow-lg hover:scale-105 transition-transform"
            aria-label={`Play ${playlist.name}`}
          >
            <Play size={28} fill="black" />
          </button>
        </div>

        <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-4 px-4 py-2 text-neutral-400 text-sm border-b border-neutral-800/50">
          <div className="text-right">#</div>
          <div>TITLE</div>
          <div>ALBUM</div>
          <div className="flex justify-end">
            <Clock size={16} />
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 w-full">
        <List
          height={listHeight || 600}
          itemCount={playlist.songs.length}
          itemSize={64}
          width="100%"
          itemData={playlist.songs}
          className="scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent"
        >
          {({ index, style, data }) => (
            <SongRowItem
              key={data[index].id}
              song={data[index]}
              index={index}
              queue={data}
              style={style}
            />
          )}
        </List>
      </div>
    </div>
  );
};

export default PlaylistDetailPage;
