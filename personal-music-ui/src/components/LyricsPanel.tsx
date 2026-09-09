"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic2, Music } from "lucide-react";
import Image from "next/image";
import { usePlayerStore } from "@/store/usePlayerStore";
import { getAuthenticatedSrc } from "@/lib/api-client";
import { parseLRC, type LyricLine } from "@/lib/lrc-parser";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

interface LyricsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LyricsPanel({ isOpen, onClose }: LyricsPanelProps) {
    const { currentSong, currentTime } = usePlayerStore();
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentLineIndex, setCurrentLineIndex] = useState(-1);
    const [coverError, setCoverError] = useState(false);
    const lyricsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setCoverError(false);
        if (currentSong?.id && isOpen) {
            fetchLyrics(currentSong.id);
        }
    }, [currentSong?.id, isOpen]);

    useEffect(() => {
        if (lyrics.length === 0) return;

        let newIndex = -1;
        for (let i = lyrics.length - 1; i >= 0; i--) {
            if (currentTime >= lyrics[i].time) {
                newIndex = i;
                break;
            }
        }

        if (newIndex !== currentLineIndex) {
            setCurrentLineIndex(newIndex);
        }
    }, [currentTime, lyrics, currentLineIndex]);

    useEffect(() => {
        if (currentLineIndex >= 0 && lyricsContainerRef.current) {
            const container = lyricsContainerRef.current;
            const activeLine = container.querySelector(`[data-index="${currentLineIndex}"]`);
            if (activeLine) {
                const containerHeight = container.clientHeight;
                const lineTop = (activeLine as HTMLElement).offsetTop;
                const lineHeight = (activeLine as HTMLElement).clientHeight;
                const scrollTo = lineTop - containerHeight / 2 + lineHeight / 2;
                container.scrollTo({ top: scrollTo, behavior: "smooth" });
            }
        }
    }, [currentLineIndex]);

    const fetchLyrics = async (songId: number) => {
        setLoading(true);
        setLyrics([]);
        try {
            const response = await fetch(`${API_BASE_URL}/api/songs/${songId}/lyrics`, {
                headers: { "x-api-key": API_KEY },
            });
            if (response.ok) {
                const data = await response.json();
                if (data.lyrics) {
                    const parsedLyrics = parseLRC(data.lyrics);
                    setLyrics(parsedLyrics);
                }
            }
        } catch (error) {
            console.error("Failed to fetch lyrics:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed right-0 top-0 bottom-0 w-96 bg-gradient-to-b from-neutral-900 to-black border-l border-neutral-800 z-40 flex flex-col shadow-2xl"
                >
                    <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                        <div className="flex items-center gap-2">
                            <Mic2 size={20} className="text-green-500" />
                            <h2 className="text-lg font-bold text-white">歌词</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {currentSong && (
                        <div className="p-4 border-b border-neutral-800">
                            <div className="flex items-center gap-4">
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
                                    {currentSong.album?.coverPath && !coverError ? (
                                        <Image
                                            src={getAuthenticatedSrc(currentSong.album.coverPath)}
                                            alt={currentSong.title}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                            onError={() => setCoverError(true)}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                                            <Music size={24} className="text-neutral-500" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold truncate text-lg">
                                        {currentSong.title}
                                    </p>
                                    <p className="text-neutral-400 truncate">
                                        {currentSong.album?.artists?.[0]?.name || "未知艺术家"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div
                        ref={lyricsContainerRef}
                        className="flex-1 overflow-y-auto px-6 py-8 scroll-smooth"
                    >
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
                                <p className="text-neutral-400 mt-4">加载歌词中...</p>
                            </div>
                        ) : lyrics.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                                <Mic2 size={48} className="opacity-50 mb-4" />
                                <p>暂无歌词</p>
                                <p className="text-sm mt-1">这首歌还没有歌词</p>
                            </div>
                        ) : (
                            <div className="space-y-4 pb-40">
                                {lyrics.map((line, index) => (
                                    <motion.p
                                        key={index}
                                        data-index={index}
                                        initial={{ opacity: 0.4 }}
                                        animate={{
                                            opacity: index === currentLineIndex ? 1 : 0.4,
                                            scale: index === currentLineIndex ? 1.05 : 1,
                                        }}
                                        transition={{ duration: 0.3 }}
                                        className={`text-center text-xl font-medium transition-colors cursor-pointer hover:opacity-80 ${index === currentLineIndex
                                            ? "text-green-400"
                                            : "text-white"
                                            }`}
                                    >
                                        {line.text}
                                    </motion.p>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
