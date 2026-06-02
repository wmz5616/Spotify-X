"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "@/lib/api-client";
import { useFavoritesStore } from "./useFavoritesStore";

interface User {
    id: number;
    email: string;
    username: string | null;
    displayName: string | null;
    avatarPath: string | null;
    avatarPosition?: string | null;
    backgroundPath?: string | null;
    backgroundPosition?: string | null;
    bio?: string | null;
    role: string | null;
    createdAt?: string;
    _count?: {
        favoriteSongs: number;
        favoriteAlbums: number;
        followedArtists: number;
        playlists: number;
    };
}

interface UserSettings {
    theme: string;
    audioQuality: string;
    autoPlay: boolean;
}

interface AuthResponse {
    accessToken: string;
    user: User;
}

interface UserState {
    user: User | null;
    token: string | null;
    settings: UserSettings | null;
    isAuthenticated: boolean;
    hasHydrated: boolean;
    isLoading: boolean;
    error: string | null;

    setHasHydrated: (val: boolean) => void;
    login: (email: string, password: string) => Promise<boolean>;
    register: (email: string, password: string, username?: string, displayName?: string) => Promise<boolean>;
    logout: () => void;
    fetchUser: () => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
    updateSettings: (data: Partial<UserSettings>) => Promise<void>;
    setToken: (token: string) => void;
    clearError: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            settings: null,
            isAuthenticated: false,
            hasHydrated: false,
            isLoading: false,
            error: null,

            setHasHydrated: (hydrated: boolean) => {
                set({ hasHydrated: hydrated });
            },

            login: async (email: string, password: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, password }),
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || "登录失败");
                    }

                    const data: AuthResponse = await response.json();
                    set({
                        user: data.user,
                        token: data.accessToken,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                    setTimeout(() => useFavoritesStore.getState().initializeFavorites(), 100);
                    return true;
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : "登录失败",
                        isLoading: false,
                    });
                    return false;
                }
            },

            register: async (email: string, password: string, username?: string, displayName?: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, password, username, displayName }),
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || "注册失败");
                    }

                    const data: AuthResponse = await response.json();
                    set({
                        user: data.user,
                        token: data.accessToken,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                    setTimeout(() => useFavoritesStore.getState().initializeFavorites(), 100);
                    return true;
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : "注册失败",
                        isLoading: false,
                    });
                    return false;
                }
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    settings: null,
                    isAuthenticated: false,
                    error: null,
                });
                useFavoritesStore.getState().reset();
            },

            fetchUser: async () => {
                const { token } = get();
                if (!token) return;

                set({ isLoading: true });
                try {
                    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    if (!response.ok) {
                        if (response.status === 401) {
                            get().logout();
                        }
                        throw new Error("获取用户信息失败");
                    }

                    const user = await response.json();
                    set({ user, isLoading: false });
                } catch (error) {
                    set({ isLoading: false });
                }
            },

            updateProfile: async (data: Partial<User>) => {
                const { token, user: currentUser } = get();
                if (!token || !currentUser) return;

                try {
                    const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(data),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || "更新失败");
                    }

                    const updatedUser = await response.json();
                    set({ user: { ...currentUser, ...updatedUser } });
                } catch (error) {
                    const message = error instanceof Error ? error.message : "更新失败";
                    set({ error: message });
                    throw error;
                }
            },

            updateSettings: async (data: Partial<UserSettings>) => {
                const { token, settings: currentSettings } = get();
                if (!token) return;

                try {
                    const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(data),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || "更新设置失败");
                    }

                    const settings = await response.json();
                    set({ settings: { ...currentSettings, ...settings } as UserSettings });
                    
                    // Synchronize with ThemeStore if theme changed
                    if (data.theme) {
                        const { useThemeStore } = await import("./useThemeStore");
                        useThemeStore.getState().setMode(data.theme as any);
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : "更新设置失败";
                    set({ error: message });
                    throw error;
                }
            },

            setToken: (token: string) => {
                set({ token, isAuthenticated: true });
            },

            clearError: () => {
                set({ error: null });
            },
        }),
        {
            name: "user-storage",
            onRehydrateStorage: (state) => {
                return () => {
                    state?.setHasHydrated(true);
                };
            },
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
