"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MoreHorizontal,
    HeartOff,
    ListPlus,
    Play,
    Disc3,
    Users,
} from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { useToastStore } from "@/store/useToastStore";
import Link from "next/link";
import AddToPlaylistModal from "./AddToPlaylistModal";

interface SongDropdownMenuProps {
    song: {
        id: number;
        title?: string;
        album?: {
            id: number;
            title: string;
            coverPath?: string | null;
            artists?: { id: number; name: string }[];
        };
    };
    onRemoveFavorite?: () => void;
}

export default function SongDropdownMenu({ song, onRemoveFavorite }: SongDropdownMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { addToQueue } = usePlayerStore();
    const { toggleFavoriteSong } = useFavoritesStore();
    const { addToast } = useToastStore();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleRemoveFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await toggleFavoriteSong(song.id);
        addToast("已取消收藏");
        onRemoveFavorite?.();
        setIsOpen(false);
    };

    const handleAddToQueue = (e: React.MouseEvent) => {
        e.stopPropagation();
        addToQueue(song as any);
        addToast("已添加到播放队列");
        setIsOpen(false);
    };

    const handleAddToPlaylist = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false);
        setShowPlaylistModal(true);
    };

    const menuItems = [
        {
            icon: HeartOff,
            label: "取消收藏",
            onClick: handleRemoveFavorite,
            className: "text-red-400 hover:text-red-300",
        },
        {
            icon: ListPlus,
            label: "添加到歌单",
            onClick: handleAddToPlaylist,
        },
        {
            icon: Play,
            label: "添加到播放队列",
            onClick: handleAddToQueue,
        },
    ];

    return (
        <>
            <div className="relative" ref={menuRef}>
                <button
                    onClick={handleToggle}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-full transition"
                >
                    <MoreHorizontal size={20} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-0 top-full mt-1 w-48 bg-neutral-800 rounded-lg shadow-xl border border-neutral-700 overflow-hidden z-50"
                        >
                            {menuItems.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={item.onClick}
                                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700 transition text-left ${item.className || "text-neutral-300 hover:text-white"
                                        }`}
                                >
                                    <item.icon size={18} />
                                    <span className="text-sm">{item.label}</span>
                                </button>
                            ))}

                            <div className="border-t border-neutral-700" />

                            {song.album && (
                                <Link
                                    href={`/album/${song.album.id}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700 transition text-neutral-300 hover:text-white"
                                >
                                    <Disc3 size={18} />
                                    <span className="text-sm">查看专辑</span>
                                </Link>
                            )}

                            {song.album?.artists && song.album.artists.length > 0 && (
                                <Link
                                    href={`/artist/${encodeURIComponent(song.album.artists[0].name)}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700 transition text-neutral-300 hover:text-white"
                                >
                                    <Users size={18} />
                                    <span className="text-sm">查看艺术家</span>
                                </Link>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AddToPlaylistModal
                isOpen={showPlaylistModal}
                onClose={() => setShowPlaylistModal(false)}
                songId={song.id}
                songTitle={song.title}
            />
        </>
    );
}
