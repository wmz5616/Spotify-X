"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageCircle,
    Bell,
    Search,
    Send,
    X,
    UserPlus,
    ChevronRight,
    Loader2,
    Calendar,
    Plus,
    Image as ImageIcon,
    Music,
    Smile,
    Music2,
    Play,
    Trash2
} from "lucide-react";
import Image from "next/image";
import { useChatStore } from "@/store/useChatStore";
import { useUserStore } from "@/store/useUserStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useToastStore } from "@/store/useToastStore";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import clsx from "clsx";
import ConfirmModal from "@/components/ui/ConfirmModal";

const formatOnlineStatus = (updatedAtStr: string | undefined) => {
    if (!updatedAtStr) return { text: "离线", isOnline: false };

    const lastActive = new Date(updatedAtStr);
    const now = new Date();
    const diffMins = differenceInMinutes(now, lastActive);
    const diffHrs = differenceInHours(now, lastActive);
    const diffDys = differenceInDays(now, lastActive);

    if (diffMins < 5) return { text: "在线", isOnline: true };
    if (diffHrs < 24) {
        if (diffMins < 60) return { text: `${diffMins}分钟前在线`, isOnline: false };
        return { text: `${diffHrs}小时前在线`, isOnline: false };
    }
    if (diffDys === 1) return { text: "昨天在线", isOnline: false };
    return { text: "离线", isOnline: false };
};

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const EMOJIS = [
    "😊", "😂", "🥰", "😍", "😒", "😭", "😘", "😜", "🙄", "🤔",
    "👍", "❤️", "🔥", "✨", "🎉", "🙌", "👋", "👌", "🙏", "💪",
    "👀", "🌟", "🌹", "🎈", "💎", "🌈", "⚡", "🎵", "🎧", "🎨"
];

const ChatInput = ({ 
    onSend, 
    onSendImage, 
    onSendSong 
}: { 
    onSend: (text: string) => void;
    onSendImage: (file: File) => void;
    onSendSong: (song: any) => void;
}) => {
    const [messageInput, setMessageInput] = useState("");
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showSongSearch, setShowSongSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowPlusMenu(false);
                setShowEmojiPicker(false);
                setShowSongSearch(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSend = () => {
        if (!messageInput.trim()) return;
        onSend(messageInput.trim());
        setMessageInput("");
        setShowEmojiPicker(false);
    };

    const handleEmojiClick = (emoji: string) => {
        setMessageInput(prev => prev + emoji);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onSendImage(file);
            setShowPlusMenu(false);
        }
    };

    const searchSongs = async (query: string) => {
        if (!query.trim()) return;
        setIsSearching(true);
        try {
            const results = await apiClient<any>(`/api/search?q=${encodeURIComponent(query)}`);
            // 结果可能包含 artists, albums, songs，我们取 songs
            setSearchResults(results.songs || []);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) searchSongs(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    return (
        <div className="p-4 bg-[#121212] border-t border-neutral-800 relative" ref={menuRef}>
            {/* Song Search Popover */}
            <AnimatePresence>
                {showSongSearch && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 right-0 bg-[#1a1a1a]/80 backdrop-blur-2xl border border-white/5 rounded-3xl mb-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden z-20 flex flex-col"
                    >
                        <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
                            <Search size={16} className="text-green-500" />
                            <input 
                                autoFocus
                                type="text"
                                placeholder="搜索您想分享的音乐..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm text-white flex-1 placeholder-neutral-500 font-medium"
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {isSearching ? (
                                <div className="p-4 flex justify-center"><Loader2 size={16} className="animate-spin text-green-500" /></div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(song => (
                                    <button
                                        key={song.id}
                                        onClick={() => {
                                            onSendSong(song);
                                            setShowSongSearch(false);
                                            setShowPlusMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 p-2 hover:bg-neutral-800 rounded-lg transition-all text-left group"
                                    >
                                        <div className="relative w-10 h-10 rounded-md overflow-hidden bg-neutral-800 flex-shrink-0">
                                            {song.album?.coverPath ? (
                                                <Image src={getAuthenticatedSrc(song.album.coverPath)} alt="" fill sizes="40px" unoptimized className="object-cover" />
                                            ) : <Music size={16} className="m-auto" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white truncate group-hover:text-green-500 transition-colors">{song.title}</p>
                                            <p className="text-[10px] text-neutral-500 truncate">{song.album?.artists?.[0]?.name}</p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="py-8 flex flex-col items-center justify-center text-neutral-500 gap-2">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                        <Music size={20} className="opacity-20 text-green-500" />
                                    </div>
                                    <p className="text-[10px] font-medium opacity-30 tracking-widest uppercase">输入歌名开始搜索</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Emoji Picker Popover */}
            <AnimatePresence>
                {showEmojiPicker && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full right-4 bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-2xl w-72 mb-4 p-4 shadow-2xl z-20"
                    >
                        <div className="grid grid-cols-6 gap-2">
                            {EMOJIS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => handleEmojiClick(emoji)}
                                    className="text-xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-white/5"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Plus Menu Popover */}
            <AnimatePresence>
                {showPlusMenu && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 bg-[#1a1a1a]/90 backdrop-blur-2xl border border-white/5 rounded-2xl p-2 mb-4 shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col gap-1 z-20 w-40"
                    >
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-800 rounded-xl transition-all text-sm text-neutral-300 hover:text-white group"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                <ImageIcon size={16} />
                            </div>
                            图片
                        </button>
                        <button 
                            onClick={() => {
                                setShowSongSearch(true);
                                setShowPlusMenu(false);
                            }}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-800 rounded-xl transition-all text-sm text-neutral-300 hover:text-white group"
                        >
                            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                                <Music size={16} />
                            </div>
                            音乐
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative flex items-center gap-3">
                <button
                    onClick={() => setShowPlusMenu(!showPlusMenu)}
                    className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white",
                        (showPlusMenu || showSongSearch) && "rotate-45 !bg-neutral-700 !text-white"
                    )}
                >
                    <Plus size={20} />
                </button>

                <div className="flex-1 relative group">
                    <input
                        type="text"
                        placeholder="发送消息..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-full pl-5 pr-12 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 focus:bg-neutral-800/50 transition-all"
                    />
                    <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={clsx(
                            "absolute right-4 top-1/2 -translate-y-1/2 transition-all p-1.5 rounded-full hover:bg-white/5",
                            showEmojiPicker ? "text-green-500" : "text-neutral-500 hover:text-neutral-300"
                        )}
                    >
                        <Smile size={20} />
                    </button>
                </div>

                <div className="flex items-center justify-center">
                    <button
                        onClick={handleSend}
                        disabled={!messageInput.trim()}
                        className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-[0_4px_15px_rgba(34,197,94,0.3)]"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
    const [activeTab, setActiveTab] = useState<"chats" | "notifications">("chats");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const messageEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const {
        conversations,
        activeConversationId,
        setActiveConversation,
        fetchConversations,
        sendMessage,
        initSocket,
        clearHistory,
        pendingRecipientUser,
        pendingRecipientId
    } = useChatStore();
    const { user } = useUserStore();
    const { notifications, fetchNotifications, markAsRead } = useNotificationStore();
    const { playSong } = usePlayerStore();
    const { addToast } = useToastStore();
    const activeConversation = conversations.find((c: any) => c.id === activeConversationId);

    useEffect(() => {
        if (isOpen && user) {
            initSocket(user.id);
            fetchConversations();
            fetchNotifications();
        }
    }, [isOpen, user, initSocket, fetchConversations, fetchNotifications]);

    useEffect(() => {
        if (!isOpen) return;
        
        // 使用 setTimeout 确保 DOM 已经根据最新消息完成了重绘
        const timer = setTimeout(() => {
            messageEndRef.current?.scrollIntoView({ 
                behavior: "auto", // 初次进入或切换时，瞬时定位
                block: "end"
            });
        }, 100);

        return () => clearTimeout(timer);
    }, [activeConversationId, isOpen]);

    useEffect(() => {
        // 当消息数量增加时（发新消息），平滑滚动到底部
        if (activeConversation?.messages?.length) {
            const timer = setTimeout(() => {
                messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [activeConversation?.messages?.length]);


    // Determine displayed user/header
    const displayedUser = activeConversation
        ? activeConversation.participants.find((p: any) => p.id !== user?.id)
        : pendingRecipientUser;

    const handleSendMessage = async (text: string) => {
        if (!user) return;

        let targetUserId = pendingRecipientId;
        if (activeConversationId) {
            const currentConv = conversations.find((c: any) => c.id === activeConversationId);
            const other = currentConv?.participants.find((p: any) => p.id !== user.id);
            if (other) {
                targetUserId = other.id;
            }
        } else if (pendingRecipientId) {
            targetUserId = pendingRecipientId;
        }

        if (targetUserId) {
            await sendMessage(targetUserId, text, user.id);
        }
    };

    const handleSendImage = async (file: File) => {
        if (!user) return;
        
        let targetUserId = pendingRecipientId;
        if (activeConversationId) {
            const currentConv = conversations.find(c => c.id === activeConversationId);
            const other = currentConv?.participants.find(p => p.id !== user.id);
            if (other) targetUserId = other.id;
        }

        if (!targetUserId) return;

        try {
            const formData = new FormData();
            formData.append("file", file);
            const { path } = await apiClient<any>("/api/chat/upload", {
                method: "POST",
                body: formData
            });

            await sendMessage(targetUserId, "[图片消息]", user.id, "image", path);
        } catch (error) {
            console.error("Failed to upload image", error);
        }
    };

    const handleSendSong = async (song: any) => {
        if (!user) return;

        let targetUserId = pendingRecipientId;
        if (activeConversationId) {
            const currentConv = conversations.find(c => c.id === activeConversationId);
            const other = currentConv?.participants.find(p => p.id !== user.id);
            if (other) targetUserId = other.id;
        }

        if (!targetUserId) return;

        await sendMessage(targetUserId, `分享歌曲: ${song.title}`, user.id, "song", undefined, song.id);
    };
    
    const handleDeleteChat = async () => {
        if (activeConversationId) {
            await clearHistory(activeConversationId);
            setShowDeleteConfirm(false);
            addToast("聊天记录已清除");
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-5xl h-[80vh] bg-[#121212] rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden flex"
                >
                    {/* Sidebar */}
                    <div className="w-80 border-r border-neutral-800 flex flex-col bg-[#000000]">
                        <div className="p-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">消息中心</h2>
                            <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
                                <X size={20} className="text-neutral-400" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-4 mb-4 gap-2">
                            <button
                                onClick={() => setActiveTab("chats")}
                                className={clsx(
                                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                                    activeTab === "chats" ? "bg-white text-black" : "bg-neutral-800 text-white hover:bg-neutral-700"
                                )}
                            >
                                私信
                            </button>
                            <button
                                onClick={() => setActiveTab("notifications")}
                                className={clsx(
                                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                                    activeTab === "notifications" ? "bg-white text-black" : "bg-neutral-800 text-white hover:bg-neutral-700"
                                )}
                            >
                                通知
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {activeTab === "chats" ? (
                                <div className="space-y-1 p-2">
                                    {/* Pending conversation (not yet in list) */}
                                    {pendingRecipientUser && !conversations.some((c: any) => c.participants.some((p: any) => p.id === pendingRecipientId)) && (
                                        <button
                                            onClick={() => setActiveConversation(null)}
                                            className={clsx(
                                                "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group relative",
                                                !activeConversationId
                                                    ? "bg-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/5"
                                                    : "hover:bg-white/5 border border-transparent hover:border-white/5"
                                            )}
                                        >
                                            <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 shadow-lg">
                                                <Image
                                                    src={getAuthenticatedSrc(pendingRecipientUser.avatarPath) || "/images/default-avatar.png"}
                                                    alt={pendingRecipientUser.displayName}
                                                    fill
                                                    sizes="48px"
                                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <span className={clsx(
                                                        "font-bold truncate transition-colors",
                                                        !activeConversationId ? "text-white" : "text-neutral-300 group-hover:text-white"
                                                    )}>
                                                        {pendingRecipientUser.displayName || pendingRecipientUser.username}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-green-500 font-bold tracking-tight truncate mt-0.5 uppercase">
                                                    新会话
                                                </div>
                                            </div>
                                            {!activeConversationId && (
                                                <motion.div
                                                    layoutId="active-indicator"
                                                    className="absolute left-0 w-1 h-6 bg-green-500 rounded-r-full"
                                                />
                                            )}
                                        </button>
                                    )}

                                    {conversations.map((conv: any) => {
                                        const other = conv.participants.find((p: any) => p.id !== user?.id);
                                        const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : undefined;
                                        return (
                                            <button
                                                key={conv.id}
                                                onClick={() => setActiveConversation(conv.id)}
                                                className={clsx(
                                                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group relative",
                                                    activeConversationId === conv.id
                                                        ? "bg-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/5"
                                                        : "hover:bg-white/5 border border-transparent hover:border-white/5"
                                                )}
                                            >
                                                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 shadow-lg">
                                                    <Image
                                                        src={getAuthenticatedSrc(other?.avatarPath) || "/images/default-avatar.png"}
                                                        alt={other?.displayName}
                                                        fill
                                                        sizes="48px"
                                                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                    {/* Online indicator on avatar if needed */}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <span className={clsx(
                                                            "font-bold truncate transition-colors",
                                                            activeConversationId === conv.id ? "text-white" : "text-neutral-300 group-hover:text-white"
                                                        )}>
                                                            {other?.displayName || other?.username}
                                                        </span>
                                                        <span className="text-[10px] text-neutral-500 font-medium pt-0.5">
                                                            {lastMsg ? formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false, locale: zhCN }) : ""}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center gap-2">
                                                        <div className={clsx(
                                                            "text-xs truncate",
                                                            (conv.unreadCount || 0) > 0 ? "text-white font-medium italic" : "text-neutral-500 group-hover:text-neutral-400"
                                                        )}>
                                                            {lastMsg ? (lastMsg.senderId === user?.id ? `你: ${lastMsg.content}` : lastMsg.content) : "暂无消息"}
                                                        </div>
                                                        {(conv.unreadCount || 0) > 0 && (
                                                            <div className="min-w-[18px] h-[18px] flex items-center justify-center bg-green-500 text-[10px] font-black text-black rounded-full px-1 shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                                                                {conv.unreadCount}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {activeConversationId === conv.id && (
                                                    <motion.div
                                                        layoutId="active-indicator"
                                                        className="absolute left-0 w-1 h-6 bg-green-500 rounded-r-full"
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-2 space-y-1">
                                    {notifications.length > 0 ? (
                                        notifications.map((n: any) => (
                                            <div
                                                key={n.id}
                                                onClick={() => !n.read && markAsRead(n.id)}
                                                className={clsx(
                                                    "p-3 rounded-xl transition-all cursor-pointer",
                                                    n.read ? "opacity-60 hover:bg-neutral-900" : "bg-white/5 border border-white/10 hover:bg-white/10"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={clsx("text-sm font-bold", !n.read ? "text-white" : "text-neutral-400")}>{n.title}</span>
                                                    <span className="text-[10px] text-neutral-500">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: zhCN })}</span>
                                                </div>
                                                <p className="text-xs text-neutral-400 leading-relaxed">{n.message}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-neutral-500 text-sm">
                                            <Bell size={40} className="mx-auto mb-2 opacity-20" />
                                            暂无新通知
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col bg-[#121212]">
                        {(activeConversation || pendingRecipientUser) ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 bg-[#121212] border-b border-neutral-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => {
                                                if (displayedUser?.username) {
                                                    router.push(`/${displayedUser.username}`);
                                                    onClose();
                                                }
                                            }}
                                        >
                                            <Image
                                                src={getAuthenticatedSrc(displayedUser?.avatarPath) || "/images/default-avatar.png"}
                                                alt={displayedUser?.displayName || ""}
                                                fill
                                                sizes="40px"
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <h3
                                                className="font-bold text-white truncate cursor-pointer hover:underline"
                                                onClick={() => {
                                                    if (displayedUser?.username) {
                                                        router.push(`/${displayedUser.username}`);
                                                        onClose();
                                                    }
                                                }}
                                            >
                                                {displayedUser?.displayName || displayedUser?.username}
                                            </h3>
                                            <div className={clsx(
                                                "text-[10px] flex items-center gap-1",
                                                formatOnlineStatus(displayedUser?.updatedAt).isOnline ? "text-green-500" : "text-neutral-500"
                                            )}>
                                                <div className={clsx(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    formatOnlineStatus(displayedUser?.updatedAt).isOnline ? "bg-green-500 animate-pulse" : "bg-neutral-500"
                                                )} />
                                                {formatOnlineStatus(displayedUser?.updatedAt).text}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {activeConversation && (
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setShowDeleteConfirm(true)}
                                                className="p-2 hover:bg-neutral-800 rounded-full transition-colors group text-neutral-400 hover:text-red-500"
                                                title="清除聊天记录"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#0a0a0a]/50">
                                    {activeConversation ? (
                                        activeConversation.messages?.map((msg, idx) => {
                                            const isMe = msg.senderId === user?.id;
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={clsx("flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300", isMe ? "items-end" : "items-start")}
                                                >
                                                    <div className={clsx(
                                                        "max-w-[80%] transition-all",
                                                        isMe ? "items-end" : "items-start"
                                                    )}>
                                                        {msg.type === "image" && msg.imagePath ? (
                                                            <div className={clsx(
                                                                "relative rounded-[22px] overflow-hidden border border-white/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] group cursor-pointer",
                                                                isMe ? "bg-green-500/10" : "bg-neutral-800"
                                                            )}>
                                                                <img 
                                                                    src={getAuthenticatedSrc(msg.imagePath)} 
                                                                    alt="Chat Image" 
                                                                    className="max-w-[300px] max-h-[300px] object-cover hover:scale-105 transition-transform duration-500"
                                                                />
                                                            </div>
                                                        ) : msg.type === "song" && msg.song ? (
                                                            <div 
                                                                onClick={() => {
                                                                    playSong(msg.song);
                                                                    addToast(`正在播放: ${msg.song.title}`);
                                                                }}
                                                                className={clsx(
                                                                    "relative group/song cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]",
                                                                    "rounded-[28px] p-2 pr-6 flex items-center gap-4 overflow-hidden",
                                                                    isMe 
                                                                        ? "bg-white text-black shadow-[0_20px_50px_rgba(0,0,0,0.3)]" 
                                                                        : "bg-neutral-900/40 backdrop-blur-2xl border border-white/5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                                                                )}
                                                            >
                                                                {/* 氛围背景 (仅对方消息) */}
                                                                {!isMe && msg.song.album?.coverPath && (
                                                                    <div className="absolute inset-0 -z-10 opacity-20 blur-2xl scale-150">
                                                                        <img src={getAuthenticatedSrc(msg.song.album.coverPath)} alt="" className="w-full h-full object-cover" />
                                                                    </div>
                                                                )}

                                                                <div className="relative flex-shrink-0 group-hover/song:rotate-2 transition-transform duration-500">
                                                                    {/* 封面阴影/发光 */}
                                                                    <div className="absolute inset-2 bg-black/40 blur-xl opacity-60 scale-90" />
                                                                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                                                                        {msg.song.album?.coverPath ? (
                                                                            <img src={getAuthenticatedSrc(msg.song.album.coverPath)} alt="" className="w-full h-full object-cover" />
                                                                        ) : <Music2 size={24} className="m-auto opacity-50" />}
                                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/song:opacity-100 transition-opacity">
                                                                            <Music2 size={24} className="text-white animate-pulse" />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                    <p className="text-[14px] font-[1000] truncate tracking-tighter leading-none mb-1">
                                                                        {msg.song.title}
                                                                    </p>
                                                                    <p className={clsx(
                                                                        "text-[11px] font-bold truncate tracking-tight uppercase opacity-40",
                                                                        isMe ? "text-black" : "text-white"
                                                                    )}>
                                                                        {msg.song.album?.artists?.[0]?.name}
                                                                    </p>
                                                                </div>

                                                                {/* Apple Music 风格箭头/图标 */}
                                                                <div className={clsx(
                                                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                                                    isMe ? "bg-black/5" : "bg-white/5 group-hover/song:bg-white/10"
                                                                )}>
                                                                    <Play size={14} fill="currentColor" stroke="none" className={isMe ? "text-black" : "text-white"} />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className={clsx(
                                                                "px-4 py-3 shadow-xl transition-all hover:scale-[1.02]",
                                                                isMe
                                                                    ? "bg-gradient-to-br from-green-500 to-emerald-600 text-black font-medium rounded-2xl rounded-tr-none"
                                                                    : "bg-neutral-800/90 backdrop-blur-sm text-neutral-100 rounded-2xl rounded-tl-none border border-white/5"
                                                            )}>
                                                                <p className="text-[13px] md:text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className={clsx(
                                                        "text-[9px] mt-1.5 font-bold uppercase tracking-wider opacity-30 px-1",
                                                        isMe ? "text-right" : "text-left"
                                                    )}>
                                                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: zhCN })}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-neutral-500 space-y-2">
                                            <p className="text-sm">打个招呼吧！</p>
                                            <p className="text-[10px] opacity-50">与 {displayedUser?.displayName} 开启新的对话</p>
                                        </div>
                                    )}
                                    <div ref={messageEndRef} />
                                </div>

                                {/* Input */}
                                <ChatInput 
                                    onSend={handleSendMessage} 
                                    onSendImage={handleSendImage}
                                    onSendSong={handleSendSong}
                                />
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 p-8 text-center">
                                <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-110">
                                    <MessageCircle size={32} className="opacity-20" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">连接你的好友</h3>
                                <p className="max-w-xs text-sm leading-relaxed">
                                    从列表选择一个会话开始聊天
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
                
                <ConfirmModal
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleDeleteChat}
                    title="确定要清除聊天记录吗？"
                    message="此操作将从服务器永久删除此会话的所有消息，且无法撤销。"
                    confirmText="确 定"
                    cancelText="取 消"
                />
            </div>
        </AnimatePresence>
    );
}
