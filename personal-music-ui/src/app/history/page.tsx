"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, Play, Trash2, Music, MoreHorizontal, RefreshCw } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import Image from "next/image";
import type { Song } from "@/types";

import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface HistoryItem {
    id: number;
    title: string;
    playedAt: string;
    album?: {
        id: number;
        title: string;
        coverPath: string;
        artists?: { id: number; name: string }[];
    };
}

export default function HistoryPage() {
    const { token, isAuthenticated, hasHydrated } = useUserStore();
    const { playSong, currentSong } = usePlayerStore();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isHydrated, setIsHydrated] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    const fetchHistory = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/history/recent?limit=200`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            }
        } catch (error) {
            console.error("获取播放历史失败:", error);
        }
        setIsLoading(false);
    }, [token]);

    useEffect(() => {
        if (isHydrated && isAuthenticated && token) {
            fetchHistory();
        }
    }, [isHydrated, isAuthenticated, token, fetchHistory]);

    useEffect(() => {
        if (isHydrated && isAuthenticated && token && currentSong) {
            const timer = setTimeout(() => {
                fetchHistory();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [currentSong?.id, isHydrated, isAuthenticated, token, fetchHistory, currentSong]);

    const handleClearHistory = () => {
        setShowClearConfirm(true);
    };

    const executeClearHistory = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/history`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                setHistory([]);
            }
        } catch (error) {
            console.error("清空历史失败:", error);
        }
    };

    const handlePlaySong = (song: HistoryItem) => {
        playSong(song as unknown as Song, history as unknown as Song[]);
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "刚刚";
        if (minutes < 60) return `${minutes} 分钟前`;
        if (hours < 24) return `${hours} 小时前`;
        if (days < 7) return `${days} 天前`;
        return date.toLocaleDateString("zh-CN");
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
                <Clock size={48} className="mb-4 opacity-50" />
                <p>请先登录查看您的播放历史</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 pb-32">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg flex items-center justify-center shadow-lg">
                            <Clock size={32} className="text-green-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">播放历史</h1>
                            <p className="text-neutral-400">最近播放的 {history.length} 首歌曲</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchHistory}
                            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition"
                            title="刷新"
                        >
                            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                        </button>
                        {history.length > 0 && (
                            <button
                                onClick={handleClearHistory}
                                className="flex items-center gap-2 px-4 py-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                            >
                                <Trash2 size={18} />
                                <span>清空历史</span>
                            </button>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-20 text-neutral-400">
                        <Clock size={48} className="mx-auto mb-4 opacity-50" />
                        <p>暂无播放历史</p>
                        <p className="text-sm mt-2">开始播放音乐，这里会记录你的播放历史</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {history.map((song, index) => (
                            <motion.div
                                key={`${song.id}-${song.playedAt}-${index}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(index * 0.02, 0.5) }}
                                className="flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-800/50 group transition cursor-pointer"
                                onClick={() => handlePlaySong(song)}
                            >
                                <div className="w-12 h-12 relative rounded overflow-hidden bg-neutral-700 flex-shrink-0">
                                    {song.album?.coverPath ? (
                                        <Image
                                            src={(() => {
                                                const path = song.album?.coverPath;
                                                if (!path) return "/placeholder.jpg";
                                                const pathWithPublic = path.startsWith("/public") ? path : `/public${path}`;
                                                return getAuthenticatedSrc(pathWithPublic);
                                            })()}
                                            alt={song.title}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Music size={20} className="text-neutral-500" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <Play size={20} className="text-white" fill="white" />
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{song.title}</p>
                                    <div className="text-neutral-400 text-sm truncate flex gap-1">
                                        {song.album?.artists && song.album.artists.length > 0 ? (
                                            song.album.artists.map((artist, i) => (
                                                <React.Fragment key={artist.id}>
                                                    <Link
                                                        href={`/artist/${encodeURIComponent(artist.name)}`}
                                                        className="hover:underline hover:text-white transition-colors"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {artist.name}
                                                    </Link>
                                                    {i < (song.album?.artists?.length || 0) - 1 && ", "}
                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <span>未知艺术家</span>
                                        )}
                                    </div>
                                </div>

                                <span className="text-neutral-500 text-sm hidden sm:block">
                                    {formatTime(song.playedAt)}
                                </span>

                                <button className="p-2 text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition">
                                    <MoreHorizontal size={20} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>

            <ConfirmModal
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={executeClearHistory}
                title="清空库历史"
                message="确定要清空所有播放历史吗？这将无法找回。"
                confirmText="清空"
                cancelText="取消"
                type="danger"
            />
        </div>
    );
}
