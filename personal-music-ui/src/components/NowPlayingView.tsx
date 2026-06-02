"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import { ChevronDown, ListMusic, Mic2 } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import Link from "next/link";
import LyricDisplay from "./LyricDisplay";
import clsx from "clsx";
import SongRowItem from "./SongRowItem";
import { useColor } from "color-thief-react";
import { getAuthenticatedSrc } from "@/lib/api-client";
import { cleanSongTitle } from "@/lib/utils";

const NowPlayingView = () => {
  const {
    isQueueOpen,
    toggleQueue,
    currentSong,
    playQueue,
    isPlaying,
  } = usePlayerStore();
  const [activeView, setActiveView] = useState<"lyrics" | "queue">("lyrics");

  useEffect(() => {
    setActiveView("lyrics");
  }, [currentSong?.id]);

  const getCoverUrl = () => {
    if (!currentSong) return "/placeholder.jpg";

    if (currentSong.album?.id) {
      const tParam = currentSong.album.title ? `?t=${encodeURIComponent(currentSong.album.title)}` : "";
      return getAuthenticatedSrc(`api/covers/${currentSong.album.id}${tParam}`);
    }

    const path = currentSong.album?.coverPath;
    if (path && path !== "undefined" && path !== "null") {
      if (path.startsWith("http")) return path;
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      if (cleanPath.startsWith("/public")) {
        return getAuthenticatedSrc(cleanPath);
      }
      return getAuthenticatedSrc(`/public${cleanPath}`);
    }

    return "/placeholder.jpg";
  };

  const albumArtUrl = getCoverUrl();

  const { data: dominantColor } = useColor(albumArtUrl, "hex", {
    crossOrigin: "anonymous",
    quality: 10,
  });

  const [backgroundStyle, setBackgroundStyle] = useState({});

  useEffect(() => {
    if (dominantColor) {
      setBackgroundStyle({
        background: `linear-gradient(135deg, ${dominantColor} 0%, #121212 70%)`,
      });
    } else {
      setBackgroundStyle({
        background: `linear-gradient(135deg, #222 0%, #121212 70%)`,
      });
    }
  }, [dominantColor, currentSong?.id]);

  const glowOpacity = useSpring(0, { stiffness: 100, damping: 20 });

  useEffect(() => {
    glowOpacity.set(0);
  }, [isPlaying, glowOpacity]);

  const { album } = currentSong || {};

  return (
    <AnimatePresence>
      {isQueueOpen && currentSong && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          style={{ willChange: "transform" }}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-neutral-900"
        >
          <div
            className="absolute inset-0 transition-colors duration-1000 ease-in-out"
            style={{
              ...backgroundStyle,
              transform: "translateZ(0)",
              willChange: "background",
            }}
          />

          <motion.div
            className="absolute inset-0 bg-white/20 mix-blend-overlay pointer-events-none"
            style={{
              opacity: glowOpacity,
              willChange: "opacity",
              transform: "translateZ(0)",
            }}
          />

          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xl"
            style={{ transform: "translateZ(0)" }}
          />

          <div className="relative z-10 flex flex-col h-full">
            <header className="flex items-center justify-between p-4 flex-shrink-0">
              <div className="flex items-center gap-4">
                <Image
                  src={albumArtUrl}
                  alt={album?.title || "Album Art"}
                  width={56}
                  height={56}
                  className="rounded-md shadow-lg"
                  unoptimized
                  priority
                />
                <div>
                  <h3 className="font-bold text-white line-clamp-1">
                    {cleanSongTitle(currentSong.title, album?.artists || currentSong.artist)}
                  </h3>
                  <div className="text-sm text-neutral-300 line-clamp-1">
                    {album?.artists && Array.isArray(album.artists) ? (
                      album.artists.map((artist, index) => (
                        <React.Fragment key={artist.id}>
                          <Link
                            href={`/artist/${encodeURIComponent(artist.name)}`}
                            className="hover:underline"
                            onClick={toggleQueue}
                          >
                            {artist.name}
                          </Link>
                          {index < album.artists.length - 1 && ", "}
                        </React.Fragment>
                      ))
                    ) : (
                      <span>Unknown Artist</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-black/30 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveView("lyrics")}
                    className={clsx(
                      "flex items-center gap-2 py-1 px-3 rounded-md text-sm transition-colors",
                      activeView === "lyrics"
                        ? "bg-green-500 text-black font-semibold"
                        : "text-neutral-300 hover:text-white"
                    )}
                  >
                    <Mic2 size={16} /> Lyrics
                  </button>
                  <button
                    onClick={() => setActiveView("queue")}
                    className={clsx(
                      "flex items-center gap-2 py-1 px-3 rounded-md text-sm transition-colors",
                      activeView === "queue"
                        ? "bg-green-500 text-black font-semibold"
                        : "text-neutral-300 hover:text-white"
                    )}
                  >
                    <ListMusic size={16} /> Queue
                  </button>
                </div>

                <button
                  onClick={toggleQueue}
                  className="p-2 rounded-full hover:bg-neutral-800/50 transition-colors text-neutral-200 hover:text-white"
                  title="Close (Swipe Down)"
                >
                  <ChevronDown size={32} />
                </button>
              </div>
            </header>

            <main className="flex-1 min-h-0">
              {activeView === "lyrics" ? (
                <LyricDisplay />
              ) : (
                <div className="p-8 h-full overflow-y-auto lyric-scrollbar">
                  <h3 className="text-2xl font-bold mb-6 text-white">
                    Up Next
                  </h3>
                  <ul className="space-y-1">
                    {playQueue.map((song, index) => (
                      <SongRowItem
                        key={`${song.id}-${index}`}
                        song={song}
                        index={index}
                        queue={playQueue}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </main>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NowPlayingView;
