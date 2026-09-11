"use client";

import React from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { motion, AnimatePresence } from "framer-motion";
import { getAuthenticatedSrc } from "@/lib/api-client";

const AmbientBackground = () => {
    const { currentSong } = usePlayerStore();
    const coverPath = currentSong?.album?.coverPath;
    const rawCoverUrl = coverPath ? (coverPath.startsWith('http') ? coverPath : coverPath) : null;
    const coverUrl = rawCoverUrl ? getAuthenticatedSrc(rawCoverUrl) : null;

    return (
        // 移动端严格禁用渐变背景，仅在桌面端夜间模式下生效
        <div id="ambient-bg" className="hidden md:block fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#121212]">
            <AnimatePresence mode="popLayout">
                {coverUrl ? (
                    <motion.div
                        key={coverUrl}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 0.6, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                            backgroundImage: `url(${coverUrl})`,
                            filter: "blur(120px) saturate(1.8) brightness(0.6)",
                        }}
                    />
                ) : (
                    <motion.div
                        key="default-bg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gradient-to-b from-neutral-900 to-[#121212]"
                    />
                )}
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/60 to-transparent" />
            <div className="absolute inset-0 bg-black/20" />
        </div>
    );
};

export default AmbientBackground;
