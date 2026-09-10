"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Trash2, Music } from "lucide-react";
import Image from "next/image";
import { usePlayerStore } from "@/store/usePlayerStore";
import { getAuthenticatedSrc } from "@/lib/api-client";

interface QueuePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function QueuePanel({ isOpen, onClose }: QueuePanelProps) {
    const { currentSong, playQueue, currentQueueIndex, playSong, removeFromQueue, clearQueue } =
        usePlayerStore();

    const queue = React.useMemo(() => {
        if (playQueue.length === 0) return [];
        if (currentQueueIndex >= playQueue.length - 1) return [];
        return playQueue.slice(currentQueueIndex + 1);
    }, [playQueue, currentQueueIndex]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed right-0 top-0 bottom-0 w-80 bg-neutral-900 border-l border-neutral-800 z-40 flex flex-col shadow-2xl"
                >
                    <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                        <h2 className="text-lg font-bold text-white">播放队列</h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {currentSong && (
                        <div className="p-4 border-b border-neutral-800">
                            <p className="text-xs text-neutral-400 uppercase mb-2">正在播放</p>
                            <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                    {currentSong.album?.coverPath ? (
                                        <Image
                                            src={getAuthenticatedSrc(currentSong.album.coverPath, 100)}
                                            alt={currentSong.title}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                                            <Music size={20} className="text-neutral-500" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate text-sm">
                                        {currentSong.title}
                                    </p>
                                    <p className="text-neutral-400 text-xs truncate">
                                        {currentSong.artist || currentSong.album?.artists?.[0]?.name || "未知艺术家"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto">
                        {queue.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                                <Music size={48} className="opacity-50 mb-4" />
                                <p>队列是空的</p>
                                <p className="text-sm mt-1">添加歌曲到队列开始播放</p>
                            </div>
                        ) : (
                            <div className="p-2">
                                <div className="flex items-center justify-between px-2 py-2 mb-2">
                                    <p className="text-xs text-neutral-400 uppercase">
                                        接下来播放 ({queue.length})
                                    </p>
                                    <button
                                        onClick={clearQueue}
                                        className="text-xs text-neutral-400 hover:text-white transition"
                                    >
                                        清空队列
                                    </button>
                                </div>
                                {queue.map((song, index) => (
                                    <motion.div
                                        key={`${song.id}-${index}`}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800 group cursor-pointer"
                                        onClick={() => playSong(song)}
                                    >
                                        <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                                            {song.album?.coverPath ? (
                                                <Image
                                                    src={getAuthenticatedSrc(song.album.coverPath, 100)}
                                                    alt={song.title}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                                                    <Music size={16} className="text-neutral-500" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                <Play size={16} className="text-white" fill="white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm truncate group-hover:text-green-400 transition">
                                                {song.title}
                                            </p>
                                            <p className="text-neutral-400 text-xs truncate">
                                                {song.artist || song.album?.artists?.[0]?.name || "未知艺术家"}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFromQueue(index);
                                            }}
                                            className="p-2 text-neutral-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
