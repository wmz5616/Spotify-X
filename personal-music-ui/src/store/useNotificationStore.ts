"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    createdAt: string;
    read: boolean;
}

interface NotificationState {
    notifications: AppNotification[];
    fetchNotifications: () => Promise<void>;
    startPolling: () => void;
    stopPolling: () => void;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    clearAll: () => void;
    getUnreadCount: () => number;
}

let pollingInterval: NodeJS.Timeout | null = null;

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            notifications: [],

            fetchNotifications: async () => {
                try {
                    const token = localStorage.getItem('token');
                    if (!token) return;

                    const response = await axios.get(`/api/notifications`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    const data = response.data.map((n: any) => ({
                        id: n.id,
                        title: n.title,
                        message: n.message,
                        type: n.type as NotificationType,
                        createdAt: n.createdAt,
                        read: n.isRead
                    }));

                    set({ notifications: data });
                } catch (error) {
                    console.error("Failed to fetch notifications", error);
                }
            },

            startPolling: () => {
                if (pollingInterval) return;
                get().fetchNotifications();
                pollingInterval = setInterval(() => {
                    get().fetchNotifications();
                }, 60000);
            },

            stopPolling: () => {
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                }
            },

            markAsRead: async (id: string) => {
                set((state) => ({
                    notifications: state.notifications.map((n) =>
                        n.id === id ? { ...n, read: true } : n
                    ),
                }));

                try {
                    const token = localStorage.getItem('token');
                    await axios.put(`/api/notifications/${id}/read`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch (error) {
                    console.error("Failed to mark as read", error);
                }
            },

            markAllAsRead: async () => {
                set((state) => ({
                    notifications: state.notifications.map((n) => ({ ...n, read: true })),
                }));

                try {
                    const token = localStorage.getItem('token');
                    await axios.put(`/api/notifications/read-all`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch (error) {
                    console.error("Failed to mark all as read", error);
                }
            },

            clearAll: () => {
                set({ notifications: [] });
            },

            getUnreadCount: () => {
                return get().notifications.filter((n) => !n.read).length;
            },
        }),
        {
            name: "notification-storage",
        }
    )
);
