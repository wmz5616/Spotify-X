"use client";

import { create } from "zustand";
import { useUserStore } from "./useUserStore";
import { CLIENT_API_BASE_URL as API_BASE_URL } from "@/lib/api-client";

interface HistoryState {
    recordPlay: (songId: number, duration?: number, completed?: boolean) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>(() => ({
    recordPlay: async (songId: number, duration?: number, completed?: boolean) => {
        const token = useUserStore.getState().token;
        if (!token) return;

        try {
            await fetch(`${API_BASE_URL}/api/history`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ songId, duration, completed }),
            });
        } catch (error) {
            console.error("记录播放历史失败:", error);
        }
    },
}));
