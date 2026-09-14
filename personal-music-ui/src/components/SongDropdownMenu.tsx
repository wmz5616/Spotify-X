"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MoreHorizontal,
    MoreVertical,
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
    icon?: "horizontal" | "vertical";
    buttonClassName?: string;
}

export default function SongDropdownMenu({
    song,
    onRemoveFavorite,
    icon = "horizontal",
    buttonClassName,
}: SongDropdownMenuProps) {
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
        setShowPlaylistModal(true);
        setIsOpen(false);
    };

    const menuItems = [
        {
            icon: HeartOff,
            label: "取消收藏",
            onClick: handleRemoveFavorite,
            className: "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300",
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
                    className={
                        buttonClassName ||
                        "p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full transition active:scale-90"
                    }
                    title="更多选项"
                >
                    {icon === "vertical" ? (
                        <MoreVertical size={18} />
                    ) : (
                        <MoreHorizontal size={20} />
                    )}
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200/80 dark:border-neutral-700/80 overflow-hidden z-50 py-1"
                        >
                            {menuItems.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={item.onClick}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition text-left ${
                                        item.className || "text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white"
                                    }`}
                                >
                                    <item.icon size={16} />
                                    <span className="text-sm">{item.label}</span>
                                </button>
                            ))}

                            <div className="border-t border-neutral-200/60 dark:border-neutral-700/60 my-1" />

                            {song.album && (
                                <Link
                                    href={`/album/${song.album.id}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white"
                                >
                                    <Disc3 size={16} />
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
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white"
                                >
                                    <Users size={16} />
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
