"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Music, Loader2 } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { useToastStore } from "@/store/useToastStore";
import Image from "next/image";
import { getAuthenticatedSrc } from "@/lib/api-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Playlist {
    id: number;
    name: string;
    coverPath?: string | null;
    _count?: { songs: number };
}

interface AddToPlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    songId: number;
    songTitle?: string;
}

export default function AddToPlaylistModal({
    isOpen,
    onClose,
    songId,
    songTitle,
}: AddToPlaylistModalProps) {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState<number | null>(null);
    const { token } = useUserStore();
    const { addToast } = useToastStore();

    useEffect(() => {
        if (isOpen && token) {
            fetchPlaylists();
        }
    }, [isOpen, token]);

    const fetchPlaylists = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/user-playlists`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setPlaylists(data);
            }
        } catch (error) {
            console.error("Failed to fetch playlists:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToPlaylist = async (playlistId: number, playlistName: string) => {
        setAdding(playlistId);
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/user-playlists/${playlistId}/songs`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ songIds: [songId] }),
                }
            );

            if (response.ok) {
                addToast(`已添加到「${playlistName}」`);
                onClose();
            } else {
                const error = await response.json();
                addToast(error.message || "添加失败");
            }
        } catch (error) {
            console.error("Failed to add song:", error);
            addToast("添加失败");
        } finally {
            setAdding(null);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-neutral-900 rounded-xl w-full max-w-md shadow-2xl border border-neutral-800"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                        <div>
                            <h2 className="text-lg font-bold text-white">添加到歌单</h2>
                            {songTitle && (
                                <p className="text-sm text-neutral-400 truncate max-w-[280px]">
                                    {songTitle}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-green-500" size={32} />
                            </div>
                        ) : playlists.length === 0 ? (
                            <div className="text-center py-12 text-neutral-400">
                                <Music size={48} className="mx-auto mb-4 opacity-50" />
                                <p>还没有创建歌单</p>
                                <p className="text-sm mt-1">点击侧边栏的"+"创建新歌单</p>
                            </div>
                        ) : (
                            <div className="p-2">
                                {playlists.map((playlist) => (
                                    <button
                                        key={playlist.id}
                                        onClick={() => handleAddToPlaylist(playlist.id, playlist.name)}
                                        disabled={adding !== null}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800 transition text-left group"
                                    >
                                        <div className="w-12 h-12 bg-neutral-700 rounded flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                                            {adding === playlist.id ? (
                                                <Loader2 className="animate-spin text-green-500" size={20} />
                                            ) : playlist.coverPath ? (
                                                <Image
                                                    src={getAuthenticatedSrc(playlist.coverPath)}
                                                    alt={playlist.name}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <Music size={20} className="text-neutral-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-white truncate group-hover:text-green-400 transition">
                                                {playlist.name}
                                            </p>
                                            <p className="text-sm text-neutral-400">
                                                {playlist._count?.songs || 0} 首歌曲
                                            </p>
                                        </div>
                                        <Plus
                                            size={20}
                                            className="text-neutral-400 group-hover:text-green-400 transition flex-shrink-0"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
