"use client";

import { create } from "zustand";
import { useUserStore } from "./useUserStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface FavoritesState {
    favoriteSongIds: Set<number>;
    favoriteAlbumIds: Set<number>;
    followedArtistIds: Set<number>;
    isLoading: boolean;
    isInitialized: boolean;
    isMutating: boolean;

    initializeFavorites: () => Promise<void>;
    toggleFavoriteSong: (songId: number) => Promise<boolean>;
    toggleFavoriteAlbum: (albumId: number) => Promise<boolean>;
    toggleFollowArtist: (artistId: number) => Promise<boolean>;
    isSongFavorited: (songId: number) => boolean;
    isAlbumFavorited: (albumId: number) => boolean;
    isArtistFollowed: (artistId: number) => boolean;
    reset: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
    favoriteSongIds: new Set<number>(),
    favoriteAlbumIds: new Set<number>(),
    followedArtistIds: new Set<number>(),
    isLoading: false,
    isInitialized: false,
    isMutating: false,

    initializeFavorites: async () => {
        const token = useUserStore.getState().token;
        if (!token) {
            if (typeof window !== "undefined") {
                try {
                    const saved = localStorage.getItem("spotify_guest_favorites");
                    if (saved) {
                        const ids = JSON.parse(saved);
                        if (Array.isArray(ids)) {
                            set({ favoriteSongIds: new Set(ids), isInitialized: true });
                        }
                    }
                } catch { }
            }
            return;
        }

        set({ isLoading: true });
        try {
            const response = await fetch(`${API_BASE_URL}/api/favorites/ids`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error("获取收藏失败");

            const data = await response.json();
            set({
                favoriteSongIds: new Set(data.songIds),
                favoriteAlbumIds: new Set(data.albumIds),
                followedArtistIds: new Set(data.artistIds),
                isLoading: false,
                isInitialized: true,
            });
        } catch (error) {
            set({ isLoading: false });
        }
    },

    toggleFavoriteSong: async (songId: number) => {
        const token = useUserStore.getState().token;
        const { favoriteSongIds } = get();
        const isFavorited = favoriteSongIds.has(songId);
        const newSet = new Set(favoriteSongIds);

        if (isFavorited) {
            newSet.delete(songId);
        } else {
            newSet.add(songId);
        }
        set({ favoriteSongIds: newSet });

        if (!token) {
            if (typeof window !== "undefined") {
                try {
                    localStorage.setItem("spotify_guest_favorites", JSON.stringify(Array.from(newSet)));
                } catch { }
            }
            return !isFavorited;
        }

        set({ isMutating: true });

        try {
            const response = await fetch(`${API_BASE_URL}/api/favorites/songs/${songId}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const revertSet = new Set(favoriteSongIds);
                set({ favoriteSongIds: revertSet });
                return false;
            }

            return true;
        } catch (error) {
            const revertSet = new Set(favoriteSongIds);
            set({ favoriteSongIds: revertSet });
            return false;
        } finally {
            set({ isMutating: false });
        }
    },

    toggleFavoriteAlbum: async (albumId: number) => {
        const token = useUserStore.getState().token;
        if (!token) return false;

        set({ isMutating: true });
        const { favoriteAlbumIds } = get();
        const isFavorited = favoriteAlbumIds.has(albumId);

        const newSet = new Set(favoriteAlbumIds);
        if (isFavorited) {
            newSet.delete(albumId);
        } else {
            newSet.add(albumId);
        }
        set({ favoriteAlbumIds: newSet });

        try {
            const response = await fetch(`${API_BASE_URL}/api/favorites/albums/${albumId}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const revertSet = new Set(favoriteAlbumIds);
                set({ favoriteAlbumIds: revertSet });
                return false;
            }

            return true;
        } catch (error) {
            const revertSet = new Set(favoriteAlbumIds);
            set({ favoriteAlbumIds: revertSet });
            return false;
        } finally {
            set({ isMutating: false });
        }
    },

    toggleFollowArtist: async (artistId: number) => {
        const token = useUserStore.getState().token;
        if (!token) return false;

        set({ isMutating: true });
        const { followedArtistIds } = get();
        const isFollowing = followedArtistIds.has(artistId);

        const newSet = new Set(followedArtistIds);
        if (isFollowing) {
            newSet.delete(artistId);
        } else {
            newSet.add(artistId);
        }
        set({ followedArtistIds: newSet });

        try {
            const response = await fetch(`${API_BASE_URL}/api/favorites/artists/${artistId}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const revertSet = new Set(followedArtistIds);
                set({ followedArtistIds: revertSet });
                return false;
            }

            return true;
        } catch (error) {
            const revertSet = new Set(followedArtistIds);
            set({ followedArtistIds: revertSet });
            return false;
        } finally {
            set({ isMutating: false });
        }
    },

    isSongFavorited: (songId: number) => {
        return get().favoriteSongIds.has(songId);
    },

    isAlbumFavorited: (albumId: number) => {
        return get().favoriteAlbumIds.has(albumId);
    },

    isArtistFollowed: (artistId: number) => {
        return get().followedArtistIds.has(artistId);
    },

    reset: () => {
        set({
            favoriteSongIds: new Set<number>(),
            favoriteAlbumIds: new Set<number>(),
            followedArtistIds: new Set<number>(),
            isInitialized: false,
        });
    },
}));
