"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { parseLRC, type LyricLine } from "@/lib/lrc-parser";
import clsx from "clsx";
import { motion } from "framer-motion";
import { VariableSizeList as List } from "react-window";
import { apiClient } from "@/lib/api-client";
import { Song } from "@/types";
import { Mic2 } from "lucide-react";

const Interlude = () => (
  <div className="flex justify-center items-center gap-1.5 h-full opacity-80 py-4">
    {[0, 1, 2, 3].map((i) => (
      <span
        key={i}
        className="w-1.5 h-6 bg-white rounded-full animate-music-bars shadow-[0_0_10px_rgba(255,255,255,0.8)]"
        style={{
          animation: "music-bars 1s ease-in-out infinite",
          animationDelay: `${i * 150}ms`,
        }}
      />
    ))}
  </div>
);

const LyricDisplay = () => {
  const { currentSong, currentTime } = usePlayerStore();
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List>(null);
  const outerRef = useRef<HTMLElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [fetchedLyrics, setFetchedLyrics] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setFetchedLyrics(null);
    if (!currentSong) return;

    if (!currentSong.lyrics) {
      setIsLoading(true);
      apiClient<{ lyrics?: string }>(`/api/songs/${currentSong.id}/lyrics`)
        .then((data) => {
          if (data && data.lyrics) {
            setFetchedLyrics(data.lyrics);
            const state = usePlayerStore.getState();
            if (state.currentSong && state.currentSong.id === currentSong.id) {
              usePlayerStore.setState({
                currentSong: { ...state.currentSong, lyrics: data.lyrics },
              });
            }
          }
        })
        .catch((err) => {
          console.error("Failed to fetch lyrics:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }

  }, [currentSong?.id, currentSong?.lyrics]);

  const lyrics: LyricLine[] = useMemo(() => {
    const rawLyrics = currentSong?.lyrics || fetchedLyrics;
    return rawLyrics ? parseLRC(rawLyrics) : [];
  }, [currentSong?.lyrics, fetchedLyrics]);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!lyrics.length) return;

    const newIndex = lyrics.findIndex(
      (line, i) =>
        currentTime >= line.time &&
        (i === lyrics.length - 1 || currentTime < lyrics[i + 1].time)
    );

    if (newIndex !== -1 && newIndex !== currentLineIndex) {
      setCurrentLineIndex(newIndex);
    }
  }, [currentTime, lyrics, currentLineIndex]);

  const getItemHeight = useCallback(
    (index: number) => {
      if (index === 0 || index === lyrics.length + 1) {
        return containerSize.height / 2;
      }

      const lyricIndex = index - 1;
      const line = lyrics[lyricIndex];
      if (!line) return 80;

      const isActive = lyricIndex === currentLineIndex;
      const hasTranslation = line.text.includes("\n");
      const baseHeight = hasTranslation ? 120 : 80;

      return isActive ? baseHeight + 60 : baseHeight;
    },
    [lyrics, containerSize.height, currentLineIndex]
  );

  useEffect(() => {
    if (listRef.current && outerRef.current && currentLineIndex !== -1) {
      listRef.current.resetAfterIndex(0);

      const targetIndex = currentLineIndex + 1;

      let offset = 0;
      for (let i = 0; i < targetIndex; i++) {
        offset += getItemHeight(i);
      }
      const targetItemHeight = getItemHeight(targetIndex);
      const centerOffset =
        offset + targetItemHeight / 2 - containerSize.height / 2;

      outerRef.current.scrollTo({
        top: centerOffset,
        behavior: "smooth",
      });
    }
  }, [currentLineIndex, containerSize.height, getItemHeight]);

  useEffect(() => {
    setCurrentLineIndex(-1);
    if (outerRef.current) {
      outerRef.current.scrollTo(0, 0);
    }
  }, [currentSong?.id]);

  return (
    <div
      className="h-full w-full overflow-hidden relative select-none font-sans"
      ref={containerRef}
    >
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.8) 100%)",
        }}
      />

      <div className="relative z-10 w-full h-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-neutral-400">
            <span className="animate-pulse">Loading Lyrics...</span>
          </div>
        ) : lyrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 space-y-4">
            <Mic2 size={48} className="opacity-50" />
            <p className="text-xl font-bold tracking-widest uppercase">
              Pure Music
            </p>
          </div>
        ) : (
          <motion.div
            key={currentSong?.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            {containerSize.height > 0 && (
              <List
                ref={listRef}
                outerRef={outerRef}
                height={containerSize.height}
                width={containerSize.width}
                itemCount={lyrics.length + 2}
                itemSize={getItemHeight}
                className="lyric-list no-scrollbar"
                itemData={lyrics}
                style={{
                  scrollBehavior: "smooth",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none"
                }}
              >
                {({ index, style }) => {
                  if (index === 0 || index === lyrics.length + 1) {
                    return <div style={style} />;
                  }

                  const lyricIndex = index - 1;
                  const line = lyrics[lyricIndex];
                  if (!line) return null;

                  const isActive = currentLineIndex === lyricIndex;
                  const parts = line.text.split("\n");
                  const originalText = parts[0];
                  const translationText = parts.length > 1 ? parts[1] : null;

                  return (
                    <div
                      style={style}
                      className="flex items-center justify-center w-full px-4 py-2"
                    >
                      <div
                        className={clsx(
                          "flex flex-col items-center gap-2 transition-all duration-500 w-full max-w-4xl text-center",
                          isActive
                            ? "opacity-100 scale-105 blur-0"
                            : "opacity-40 scale-95 blur-[0.5px] hover:opacity-60 cursor-pointer"
                        )}
                        onClick={() => {
                          const playerStore = usePlayerStore.getState();
                          playerStore.seek(line.time);
                          playerStore.setCurrentTime(line.time);
                        }}
                      >
                        <span
                          className={clsx(
                            "leading-tight transition-all duration-500 font-bold",
                            isActive
                              ? "text-white text-3xl md:text-5xl drop-shadow-lg"
                              : "text-neutral-300 text-xl md:text-2xl"
                          )}
                        >
                          {originalText || <Interlude />}
                        </span>

                        {translationText && (
                          <span
                            className={clsx(
                              "transition-all duration-500 font-medium",
                              isActive
                                ? "text-green-400 text-lg md:text-xl"
                                : "text-neutral-500 text-sm md:text-base"
                            )}
                          >
                            {translationText}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }}
              </List>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LyricDisplay;
