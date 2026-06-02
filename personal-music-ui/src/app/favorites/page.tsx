"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Music, Disc3, Users, Play, RefreshCw, CheckSquare, Square, HeartOff, X, Calendar } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { useToastStore } from "@/store/useToastStore";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Song } from "@/types";
import SongDropdownMenu from "@/components/SongDropdownMenu";
import Link from "next/link";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type FavoriteTab = "songs" | "albums" | "artists";

interface FavoriteItem {
    id: number;
    title?: string;
    name?: string;
    coverPath?: string;
    imagePath?: string;
    avatarUrl?: string;
    favoritedAt?: string;
    followedAt?: string;
    album?: { id: number; title: string; coverPath: string; artists?: { id: number; name: string }[] };
    artists?: { id: number; name: string }[];
    _count?: { albums?: number; songs?: number };
}

export default function FavoritesPage() {
    const router = useRouter();
    const { token, isAuthenticated, hasHydrated } = useUserStore();
    const { playSong } = usePlayerStore();
    const { favoriteSongIds, toggleFavoriteSong, isMutating } = useFavoritesStore();
    const { addToast } = useToastStore();
    const [activeTab, setActiveTab] = useState<FavoriteTab>("songs");
    const [songs, setSongs] = useState<FavoriteItem[]>([]);
    const [albums, setAlbums] = useState<FavoriteItem[]>([]);
    const [artists, setArtists] = useState<FavoriteItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isHydrated, setIsHydrated] = useState(false);

    const [isBatchMode, setIsBatchMode] = useState(false);
    const [selectedSongIds, setSelectedSongIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    const fetchFavorites = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);

        try {
            const endpoint =
                activeTab === "songs"
                    ? "/api/favorites/songs"
                    : activeTab === "albums"
                        ? "/api/favorites/albums"
                        : "/api/favorites/artists";

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                if (activeTab === "songs") setSongs(data);
                else if (activeTab === "albums") setAlbums(data);
                else setArtists(data);
            }
        } catch (error) {
            console.error("获取收藏失败:", error);
        }
        setIsLoading(false);
    }, [token, activeTab]);

    useEffect(() => {
        if (isHydrated && isAuthenticated && token) {
            fetchFavorites();
        }
    }, [isHydrated, isAuthenticated, token, activeTab, fetchFavorites]);

    useEffect(() => {
        if (!isMutating && isHydrated && isAuthenticated && token && activeTab === "songs") {
            fetchFavorites();
        }
    }, [favoriteSongIds, isMutating, isHydrated, isAuthenticated, token, activeTab, fetchFavorites]);

    const handlePlaySong = (song: FavoriteItem) => {
        if (isBatchMode) return;
        playSong(song as unknown as Song, songs as unknown as Song[]);
    };

    const toggleSongSelection = (songId: number) => {
        setSelectedSongIds(prev => {
            const next = new Set(prev);
            if (next.has(songId)) {
                next.delete(songId);
            } else {
                next.add(songId);
            }
            return next;
        });
    };

    const selectAll = () => {
        setSelectedSongIds(new Set(songs.map(s => s.id)));
    };

    const deselectAll = () => {
        setSelectedSongIds(new Set());
    };

    const exitBatchMode = () => {
        setIsBatchMode(false);
        setSelectedSongIds(new Set());
    };

    const handleBatchRemove = async () => {
        if (selectedSongIds.size === 0) return;

        for (const songId of selectedSongIds) {
            await toggleFavoriteSong(songId);
        }
        addToast(`已取消收藏 ${selectedSongIds.size} 首歌曲`, "success");
        exitBatchMode();
    };

    const tabs = [
        { id: "songs" as FavoriteTab, label: "歌曲", icon: Music, count: songs.length },
        { id: "albums" as FavoriteTab, label: "专辑", icon: Disc3, count: albums.length },
        { id: "artists" as FavoriteTab, label: "艺术家", icon: Users, count: artists.length },
    ];

    const getImageUrl = (item: FavoriteItem) => {
        const getPath = (path: string | undefined) => {
            if (!path) return null;
            if (path.startsWith("http")) return path;
            const pathWithPublic = path.startsWith("/public") ? path : `/public${path}`;
            return getAuthenticatedSrc(pathWithPublic);
        };

        if (item.coverPath) return getPath(item.coverPath);
        if (item.imagePath) return getPath(item.imagePath);
        if (item.avatarUrl) return getPath(item.avatarUrl);
        if (item.album?.coverPath) return getPath(item.album.coverPath);
        return null;
    };

    const getFollowDays = (followedAt?: string) => {
        if (!followedAt) return 0;
        const followDate = new Date(followedAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - followDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    if (!isHydrated || !hasHydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-neutral-400">
                <Heart size={48} className="mb-4 opacity-50" />
                <p>请先登录查看您的收藏</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 pb-32">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg flex items-center justify-center shadow-lg">
                        <Heart size={32} className="text-green-500" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-white">我的收藏</h1>
                        <p className="text-neutral-400">你收藏的所有内容</p>
                    </div>
                    <button
                        onClick={fetchFavorites}
                        className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition"
                        title="刷新"
                    >
                        <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>

                <div className="flex gap-2 mb-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${activeTab === tab.id
                                ? "bg-white text-black"
                                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                                }`}
                        >
                            <tab.icon size={16} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <div>
                        {activeTab === "songs" && (
                            songs.length === 0 ? (
                                <div className="text-center py-20 text-neutral-400">
                                    <Music size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>还没有收藏的歌曲</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-neutral-400 text-sm">
                                            共 {songs.length} 首歌曲
                                        </div>
                                        {!isBatchMode ? (
                                            <button
                                                onClick={() => setIsBatchMode(true)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
                                            >
                                                <CheckSquare size={16} />
                                                选择
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-neutral-400">
                                                    已选 {selectedSongIds.size} 项
                                                </span>
                                                <button
                                                    onClick={selectedSongIds.size === songs.length ? deselectAll : selectAll}
                                                    className="px-3 py-1.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition"
                                                >
                                                    {selectedSongIds.size === songs.length ? "取消全选" : "全选"}
                                                </button>
                                                <button
                                                    onClick={exitBatchMode}
                                                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {songs.map((song, i) => (
                                            <motion.div
                                                key={song.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.02 }}
                                                className={`flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-800/50 group cursor-pointer ${selectedSongIds.has(song.id) ? "bg-neutral-800/70" : ""
                                                    }`}
                                                onClick={() => isBatchMode ? toggleSongSelection(song.id) : handlePlaySong(song)}
                                            >
                                                {isBatchMode && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleSongSelection(song.id);
                                                        }}
                                                        className="flex-shrink-0 text-neutral-400 hover:text-white"
                                                    >
                                                        {selectedSongIds.has(song.id) ? (
                                                            <CheckSquare size={20} className="text-green-500" />
                                                        ) : (
                                                            <Square size={20} />
                                                        )}
                                                    </button>
                                                )}
                                                <div className="w-12 h-12 relative rounded overflow-hidden bg-neutral-700 flex-shrink-0">
                                                    {getImageUrl(song) ? (
                                                        <Image
                                                            src={getImageUrl(song)!}
                                                            alt={song.title || ""}
                                                            fill
                                                            className="object-cover"
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Music size={20} className="text-neutral-500" />
                                                        </div>
                                                    )}
                                                    {!isBatchMode && (
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                            <Play size={20} className="text-white" fill="white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium truncate">{song.title}</p>
                                                    <p className="text-neutral-400 text-sm truncate">
                                                        {song.album?.artists?.map((a, idx) => (
                                                            <React.Fragment key={a.id}>
                                                                <Link 
                                                                    href={`/artist/${encodeURIComponent(a.name)}`}
                                                                    className="hover:underline hover:text-white transition-colors"
                                                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                                                >
                                                                    {a.name}
                                                                </Link>
                                                                {idx < (song.album?.artists?.length || 0) - 1 && ", "}
                                                            </React.Fragment>
                                                        )) || "未知艺术家"}
                                                    </p>
                                                </div>
                                                {!isBatchMode && (
                                                    <div className="opacity-0 group-hover:opacity-100 transition">
                                                        <SongDropdownMenu song={song} onRemoveFavorite={fetchFavorites} />
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>

                                    <AnimatePresence>
                                        {isBatchMode && selectedSongIds.size > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 20 }}
                                                className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-neutral-800 border border-neutral-700 rounded-full px-6 py-3 shadow-2xl flex items-center gap-4 z-50"
                                            >
                                                <span className="text-white font-medium">
                                                    已选择 {selectedSongIds.size} 首歌曲
                                                </span>
                                                <button
                                                    onClick={handleBatchRemove}
                                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-full transition"
                                                >
                                                    <HeartOff size={16} />
                                                    取消收藏
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            )
                        )}

                        {activeTab === "albums" && (
                            albums.length === 0 ? (
                                <div className="text-center py-20 text-neutral-400">
                                    <Disc3 size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>还没有收藏的专辑</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {albums.map((album, i) => (
                                        <motion.div
                                            key={album.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => router.push(`/album/${album.id}`)}
                                            className="group p-4 bg-neutral-800/50 rounded-lg hover:bg-neutral-700/50 transition cursor-pointer"
                                        >
                                            <div className="aspect-square relative rounded-md overflow-hidden mb-4 bg-neutral-700 shadow-lg">
                                                {getImageUrl(album) ? (
                                                    <Image
                                                        src={getImageUrl(album)!}
                                                        alt={album.title || album.name || ""}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Disc3 size={32} className="text-neutral-500" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <div
                                                        className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform duration-300 hover:scale-110 active:scale-95"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/album/${album.id}`);
                                                        }}
                                                    >
                                                        <Play size={20} fill="black" className="text-black ml-1" />
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-white font-medium truncate group-hover:text-green-400 transition-colors">{album.title || album.name}</p>
                                            <p className="text-neutral-400 text-sm truncate">
                                                {album.artists?.map((a, idx) => (
                                                    <React.Fragment key={a.id}>
                                                        <Link 
                                                            href={`/artist/${encodeURIComponent(a.name)}`}
                                                            className="hover:underline hover:text-white transition-colors"
                                                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                                        >
                                                            {a.name}
                                                        </Link>
                                                        {idx < (album.artists?.length || 0) - 1 && ", "}
                                                    </React.Fragment>
                                                )) || "未知艺术家"}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            )
                        )}

                        {activeTab === "artists" && (
                            artists.length === 0 ? (
                                <div className="text-center py-20 text-neutral-400">
                                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>还没有关注的艺术家</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                    {artists.map((artist, i) => (
                                        <motion.div
                                            key={artist.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => router.push(`/artist/${encodeURIComponent(artist.name || "")}`)}
                                            className="group p-5 bg-neutral-800/40 rounded-xl hover:bg-neutral-700/60 transition-all duration-300 cursor-pointer text-center hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1"
                                        >
                                            <div className="aspect-square relative rounded-full overflow-hidden mb-4 bg-neutral-700 mx-auto w-28 h-28 ring-2 ring-transparent group-hover:ring-green-500/50 transition-all duration-300 shadow-lg">
                                                {getImageUrl(artist) ? (
                                                    <Image
                                                        src={getImageUrl(artist)!}
                                                        alt={artist.name || ""}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-600 to-neutral-800">
                                                        <Users size={36} className="text-neutral-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-white font-semibold truncate mb-1 group-hover:text-green-400 transition-colors">{artist.name}</p>
                                            <p className="text-neutral-400 text-sm mb-2">
                                                {artist._count?.albums || 0} 张专辑
                                            </p>
                                            <div className="flex items-center justify-center gap-1.5 text-neutral-500 text-xs">
                                                <Calendar size={12} />
                                                <span>已关注 {getFollowDays(artist.followedAt)} 天</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
