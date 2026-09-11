import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Song } from "@/types";
import React from "react";

export type PlayMode = "normal" | "repeat-all" | "repeat-one" | "shuffle";

interface PlayerState {
  isPlaying: boolean;
  currentSong: Song | null;
  volume: number;
  currentTime: number;
  duration: number;
  playQueue: Song[];
  originalQueue: Song[];
  currentQueueIndex: number;
  playMode: PlayMode;
  isQueueOpen: boolean;
  isLoading: boolean;
  isFullScreen: boolean;
  isMuted: boolean;
  prevVolume: number;
  autoPlayNext: boolean;

  audioRef: React.RefObject<HTMLAudioElement | null> | null;
  analyser: AnalyserNode | null;

  queue: Song[];

  playSong: (song: Song, queue?: Song[]) => void;
  togglePlayPause: () => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setAudioRef: (ref: React.RefObject<HTMLAudioElement | null>) => void;
  setAnalyser: (analyser: AnalyserNode | null) => void;
  seek: (time: number) => void;

  playNext: () => void;
  playPrev: () => void;
  insertNext: (song: Song) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  handleSongEnd: () => void;

  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleQueue: () => void;
  setIsLoading: (loading: boolean) => void;
  toggleFullScreen: () => void;
  setFullScreen: (isFull: boolean) => void;
  toggleMute: () => void;
  setAutoPlayNext: (enabled: boolean) => void;
}

const shuffleArray = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      isPlaying: false,
      currentSong: null,
      volume: 0.8,
      currentTime: 0,
      duration: 0,
      playQueue: [],
      originalQueue: [],
      currentQueueIndex: -1,
      playMode: "normal",
      isQueueOpen: false,
      isLoading: false,
      isFullScreen: false,
      isMuted: false,
      prevVolume: 0.8,
      autoPlayNext: true,
      audioRef: null,
      analyser: null,

      get queue() {
        const state = get();
        const idx = state.currentQueueIndex;
        if (state.playQueue.length === 0) return [];
        if (idx >= state.playQueue.length - 1) return [];

        return state.playQueue.slice(idx + 1);
      },

      playSong: (song, queue) => {
        const state = get();
        let newQueue = state.playQueue;
        let newOriginalQueue = state.originalQueue;
        let newIndex = -1;

        if (queue && queue.length > 0) {
          if (state.playMode === "shuffle") {
            newOriginalQueue = [...queue];
            const others = queue.filter((s) => s.id !== song.id);
            newQueue = [song, ...shuffleArray(others)];
            newIndex = 0;
          } else {
            newQueue = queue;
            newOriginalQueue = [];
            newIndex = newQueue.findIndex((s) => s.id === song.id);
          }
        } else {
          if (state.playQueue.some((s) => s.id === song.id)) {
            newIndex = state.playQueue.findIndex((s) => s.id === song.id);
          } else {
            newQueue = [...state.playQueue, song];
            if (
              state.playMode === "shuffle" &&
              state.originalQueue.length > 0
            ) {
              newOriginalQueue = [...state.originalQueue, song];
            }
            newIndex = newQueue.length - 1;
          }
        }

        set({
          currentSong: song,
          duration: song.duration || 0,
          playQueue: newQueue,
          originalQueue: newOriginalQueue,
          currentQueueIndex: newIndex,
          isPlaying: true,
          isLoading: true,
          currentTime: 0,
        });
      },

      togglePlayPause: () => {
        const { isPlaying, currentSong, audioRef } = get();
        if (!currentSong) return;

        if (isPlaying) {
          audioRef?.current?.pause();
        } else {
          const audio = audioRef?.current;
          if (audio && audio.src && audio.src !== window.location.href) {
            audio.play()?.catch?.((err) => {
              if (err.name !== "AbortError" && err.name !== "NotSupportedError") {
                console.warn("Play failed:", err);
              }
            });
          }
        }
        set({ isPlaying: !isPlaying });
      },

      setVolume: (volume) => {
        const { audioRef } = get();
        if (audioRef?.current) {
          audioRef.current.volume = volume;
        }
        set({ volume, isMuted: volume === 0 });
      },

      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      setAudioRef: (ref) => set({ audioRef: ref }),
      setAnalyser: (analyser) => set({ analyser }),

      seek: (time) => {
        const { audioRef } = get();
        if (audioRef?.current) {
          audioRef.current.currentTime = time;
        }
        set({ currentTime: time });
      },

      playNext: () => {
        const { playQueue, currentQueueIndex, playMode } = get();
        if (playQueue.length === 0) return;

        let nextIndex = currentQueueIndex + 1;

        if (nextIndex >= playQueue.length) {
          if (playMode === "normal") {
            set({ isPlaying: false });
            return;
          }
          nextIndex = 0;
        }

        const nextSong = playQueue[nextIndex];
        get().playSong(nextSong);
      },

      playPrev: () => {
        const { playQueue, currentQueueIndex, currentTime, audioRef } = get();
        if (playQueue.length === 0) return;

        if (currentTime > 3 && audioRef?.current) {
          audioRef.current.currentTime = 0;
          return;
        }

        const prevIndex =
          (currentQueueIndex - 1 + playQueue.length) % playQueue.length;
        const prevSong = playQueue[prevIndex];
        get().playSong(prevSong);
      },

      insertNext: (song) => {
        const { playQueue, originalQueue, currentQueueIndex } = get();

        const newQueue = [...playQueue];
        const insertIndex = currentQueueIndex + 1;
        newQueue.splice(insertIndex, 0, song);

        const newOriginalQueue =
          originalQueue.length > 0 ? [...originalQueue, song] : [];

        if (playQueue.length === 0) {
          get().playSong(song, [song]);
        } else {
          set({
            playQueue: newQueue,
            originalQueue: newOriginalQueue,
          });
        }
      },

      addToQueue: (song) => {
        set((state) => {
          const newQueue = [...state.playQueue, song];
          const newOriginalQueue =
            state.originalQueue.length > 0
              ? [...state.originalQueue, song]
              : [];

          return {
            playQueue: newQueue,
            originalQueue: newOriginalQueue,
          };
        });
      },

      removeFromQueue: (index) => {
        set((state) => {
          const actualIndex = state.currentQueueIndex + 1 + index;
          if (actualIndex < 0 || actualIndex >= state.playQueue.length) return state;

          const newQueue = [...state.playQueue];
          newQueue.splice(actualIndex, 1);

          const newOriginalQueue = state.originalQueue.length > 0
            ? state.originalQueue.filter((_, i) => i !== actualIndex)
            : [];

          return {
            playQueue: newQueue,
            originalQueue: newOriginalQueue,
          };
        });
      },

      clearQueue: () => {
        set((state) => ({
          playQueue: state.currentSong ? [state.currentSong] : [],
          originalQueue: [],
          currentQueueIndex: state.currentSong ? 0 : -1,
        }));
      },

      handleSongEnd: () => {
        const { playMode, audioRef, autoPlayNext } = get();
        if (playMode === "repeat-one" && audioRef?.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play()?.catch?.((err) => {
            if (err.name !== "AbortError" && err.name !== "NotSupportedError") {
              console.warn("Repeat play failed:", err);
            }
          });
        } else if (autoPlayNext) {
          get().playNext();
        } else {
          set({ isPlaying: false });
        }
      },

      toggleShuffle: () => {
        const state = get();
        const { playMode, playQueue, currentSong, originalQueue } = state;

        if (playMode === "shuffle") {
          const targetQueue =
            originalQueue.length > 0 ? originalQueue : playQueue;

          let newIndex = targetQueue.findIndex((s) => s.id === currentSong?.id);
          if (newIndex === -1) newIndex = 0;

          set({
            playMode: "normal",
            playQueue: targetQueue,
            currentQueueIndex: newIndex,
            originalQueue: [],
          });
        } else {
          if (playQueue.length === 0) {
            set({ playMode: "shuffle" });
            return;
          }

          const others = playQueue.filter((s) => s.id !== currentSong?.id);
          const shuffledOthers = shuffleArray(others);
          const shuffledQueue = currentSong
            ? [currentSong, ...shuffledOthers]
            : shuffledOthers;

          set({
            playMode: "shuffle",
            playQueue: shuffledQueue,
            originalQueue: playQueue,
            currentQueueIndex: 0,
          });
        }
      },

      toggleRepeat: () =>
        set((state) => {
          const modes: PlayMode[] = ["normal", "repeat-all", "repeat-one"];

          if (state.playMode === "shuffle") return { playMode: "repeat-all" };

          const nextIndex = (modes.indexOf(state.playMode) + 1) % modes.length;
          return { playMode: modes[nextIndex] };
        }),

      toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
      setIsLoading: (loading) => set({ isLoading: loading }),

      toggleFullScreen: () =>
        set((state) => ({ isFullScreen: !state.isFullScreen })),
      setFullScreen: (isFull) => set({ isFullScreen: isFull }),

      toggleMute: () => {
        const { isMuted, volume, prevVolume, setVolume } = get();
        if (isMuted) {
          setVolume(prevVolume || 0.8);
          set({ isMuted: false });
        } else {
          set({ prevVolume: volume });
          setVolume(0);
          set({ isMuted: true });
        }
      },

      setAutoPlayNext: (enabled: boolean) => set({ autoPlayNext: enabled }),
    }),
    {
      name: "player-storage",
      partialize: (state) => ({
        currentSong: state.currentSong,
        volume: state.volume,
        playMode: state.playMode,
        isMuted: state.isMuted,
        prevVolume: state.prevVolume,
        autoPlayNext: state.autoPlayNext,
        playQueue: state.playQueue,
        originalQueue: state.originalQueue,
        currentQueueIndex: state.currentQueueIndex,
      }),
    }
  )
);
