import { create } from "zustand";

export interface FeedVideoItem {
  id: string;
  title: string;
  artist: string;
  cover: string;
  videoUrl: string;
  playCount?: number | string;
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  isFollowed?: boolean;
}

interface VideoFeedState {
  videoList: FeedVideoItem[];
  currentIndex: number;
  savedTime: number;
  isPlaying: boolean;
  isInitialized: boolean;

  setVideoList: (list: FeedVideoItem[]) => void;
  appendVideos: (list: FeedVideoItem[]) => void;
  setCurrentIndex: (index: number) => void;
  setSavedTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  toggleLike: (id: string) => void;
  toggleFollow: (id: string) => void;
  resetProgress: () => void;
}

export const useVideoFeedStore = create<VideoFeedState>((set, get) => ({
  videoList: [],
  currentIndex: 0,
  savedTime: 0,
  isPlaying: true,
  isInitialized: false,

  setVideoList: (list) =>
    set({
      videoList: list,
      isInitialized: true,
    }),

  appendVideos: (newItems) =>
    set((state) => {
      const existingIds = new Set(state.videoList.map((v) => v.id));
      const filtered = newItems.filter((item) => !existingIds.has(item.id));
      return { videoList: [...state.videoList, ...filtered] };
    }),

  setCurrentIndex: (index) =>
    set({
      currentIndex: index,
      savedTime: 0, // 切换到新视频时，进度归零
    }),

  setSavedTime: (time) => set({ savedTime: time }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  toggleLike: (id) =>
    set((state) => ({
      videoList: state.videoList.map((item) => {
        if (item.id === id) {
          const newLiked = !item.isLiked;
          const currentCount = item.likesCount || 1024;
          return {
            ...item,
            isLiked: newLiked,
            likesCount: newLiked ? currentCount + 1 : Math.max(0, currentCount - 1),
          };
        }
        return item;
      }),
    })),

  toggleFollow: (id) =>
    set((state) => ({
      videoList: state.videoList.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            isFollowed: !item.isFollowed,
          };
        }
        return item;
      }),
    })),

  resetProgress: () => set({ savedTime: 0 }),
}));
