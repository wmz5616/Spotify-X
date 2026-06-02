import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { apiClient } from "@/lib/api-client";

interface Message {
    id: number;
    conversationId: number;
    senderId: number;
    content: string;
    createdAt: string;
    sender: {
        id: number;
        username: string;
        displayName: string;
        avatarPath: string;
        updatedAt?: string;
    };
    type: "text" | "image" | "song";
    imagePath?: string;
    songId?: number;
    song?: any;
}

interface Conversation {
    id: number;
    participants: any[];
    messages: Message[];
    updatedAt: string;
    unreadCount?: number;
}

interface ChatState {
    socket: Socket | null;
    conversations: Conversation[];
    activeConversationId: number | null;
    isChatOpen: boolean;
    isLoading: boolean;
    pendingRecipientId: number | null;
    pendingRecipientUser: any | null;
    
    totalUnreadCount: number;
    
    initSocket: (userId: number) => void;
    fetchConversations: () => Promise<void>;
    fetchMessages: (conversationId: number) => Promise<void>;
    sendMessage: (recipientId: number, content: string, senderId: number, type?: string, imagePath?: string, songId?: number) => Promise<void>;
    setActiveConversation: (id: number | null) => void;
    setChatOpen: (open: boolean) => void;
    startChatWith: (userId: number) => void;
    addMessage: (message: Message) => void;
    markAsRead: (conversationId: number) => Promise<void>;
    clearHistory: (conversationId: number) => Promise<void>;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const useChatStore = create<ChatState>((set, get) => ({
    socket: null,
    conversations: [],
    activeConversationId: null,
    isChatOpen: false,
    isLoading: false,
    totalUnreadCount: 0,
    pendingRecipientId: null,
    pendingRecipientUser: null,

    initSocket: (userId: number) => {
        if (get().socket) return;

        const socket = io(SOCKET_URL);
        
        socket.on("connect", () => {
            console.log("Socket connected");
        });

        socket.on(`user_notification_${userId}`, (data) => {
            if (data.type === "message") {
                const message = data.message;
                get().addMessage(message);
                
                // Play sound for incoming messages
                if (message.senderId !== userId) {
                    const audio = new Audio("/sounds/bubble.mp3");
                    // Reset audio to start in case of overlapping plays
                    audio.currentTime = 0;
                    audio.play().catch(e => console.log("Audio play failed", e));
                }
            }
        });

        socket.on("newMessage", (message: Message) => {
            get().addMessage(message);
        });

        // Start heartbeat to update online status
        setInterval(() => {
            if (get().socket?.connected) {
                get().socket?.emit("heartbeat", userId);
            }
        }, 60000); // every minute

        set({ socket });
    },

    fetchConversations: async () => {
        set({ isLoading: true });
        try {
            const data = await apiClient<any[]>("/api/chat/conversations");
            const totalUnread = data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
            set({ conversations: data, isLoading: false, totalUnreadCount: totalUnread });
        } catch (error) {
            set({ isLoading: false });
        }
    },

    fetchMessages: async (conversationId: number) => {
        try {
            const messages = await apiClient<Message[]>(`/api/chat/messages/${conversationId}`);
            set(state => ({
                conversations: state.conversations.map(c => 
                    c.id === conversationId ? { ...c, messages } : c
                )
            }));
        } catch (error) {}
    },

    sendMessage: async (recipientId: number, content: string, senderId: number, type: string = "text", imagePath?: string, songId?: number) => {
        const { socket } = get();
        if (socket && socket.connected) {
            console.log(`Sending message (${type}) to ${recipientId}: ${content}`);
            socket.emit("sendMessage", { recipientId, content, senderId, type, imagePath, songId }, (message: Message) => {
                if (message) {
                    get().addMessage(message);
                }
            });
        } else {
            console.error("Socket not connected, cannot send message");
            // Attempt to re-init
            get().initSocket(senderId);
        }
    },

    setActiveConversation: (id: number | null) => {
        const { socket, activeConversationId } = get();
        
        // Clear pending when switching to a real conversation
        if (id !== null) {
            set({ pendingRecipientId: null, pendingRecipientUser: null });
        }

        // Leave old room
        if (activeConversationId && socket) {
            socket.emit("leaveRoom", activeConversationId);
        }
        
        set({ activeConversationId: id });
        
        // Join new room
        if (id && socket) {
            socket.emit("joinRoom", id);
            get().fetchMessages(id);
            get().markAsRead(id);
        }
    },

    setChatOpen: (open: boolean) => {
        set({ isChatOpen: open });
    },

    startChatWith: async (userId: number) => {
        const { conversations, setActiveConversation, setChatOpen } = get();
        const existing = conversations.find(c => c.participants.some(p => p.id === userId));
        
        if (existing) {
            set({ pendingRecipientId: null, pendingRecipientUser: null });
            setActiveConversation(existing.id);
        } else {
            set({ activeConversationId: null, pendingRecipientId: userId, isLoading: true });
            try {
                // Fetch the recipient user info
                const user = await apiClient<any>(`/api/user/profile/${userId}`);
                set({ pendingRecipientUser: user, isLoading: false });
            } catch (error) {
                set({ isLoading: false });
            }
        }
        setChatOpen(true);
    },

    addMessage: (message: Message) => {
        set(state => {
            const exists = state.conversations.find(c => c.id === message.conversationId);
            const isActive = state.activeConversationId === message.conversationId;
            
            if (exists) {
                // Prevent duplicate messages
                if (exists.messages?.some(m => m.id === message.id)) {
                    return state;
                }

                const newConversations = state.conversations.map(c => 
                    c.id === message.conversationId 
                        ? { 
                            ...c, 
                            messages: [...(c.messages || []), message], 
                            updatedAt: message.createdAt,
                            unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1
                        }
                        : c
                ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                
                const totalUnread = newConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
                
                return {
                    conversations: newConversations,
                    totalUnreadCount: totalUnread
                };
            } else {
                // If it's a new conversation and we have a pending recipient,
                // assume this message transitions us to that conversation.
                if (state.pendingRecipientId) {
                    set({ 
                        activeConversationId: message.conversationId,
                        pendingRecipientId: null,
                        pendingRecipientUser: null
                    });
                }

                get().fetchConversations();
                return state;
            }
        });
    },

    markAsRead: async (conversationId: number) => {
        try {
            await apiClient(`/api/chat/read/${conversationId}`, { method: "POST" });
            set(state => {
                const newConversations = state.conversations.map(c => 
                    c.id === conversationId ? { ...c, unreadCount: 0 } : c
                );
                const totalUnread = newConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
                return {
                    conversations: newConversations,
                    totalUnreadCount: totalUnread
                };
            });
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    },

    clearHistory: async (conversationId: number) => {
        try {
            await apiClient(`/api/chat/conversation/${conversationId}/messages`, { method: "DELETE" });
            set(state => ({
                conversations: state.conversations.map(c => 
                    c.id === conversationId ? { ...c, messages: [] } : c
                )
            }));
        } catch (error) {
            console.error("Failed to clear history", error);
        }
    }
}));
