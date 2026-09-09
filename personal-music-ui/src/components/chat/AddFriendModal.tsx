"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, UserPlus, Send, Check, UserMinus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";
import { useToastStore } from "@/store/useToastStore";
import { useUserStore } from "@/store/useUserStore";

interface AddFriendModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddFriendModal({ isOpen, onClose }: AddFriendModalProps) {
    const [searchId, setSearchId] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const addToast = useToastStore(state => state.addToast);
    const currentUser = useUserStore(state => state.user);

    const handleSearch = async () => {
        if (!searchId.trim()) return;
        setIsSearching(true);
        setHasSearched(true);
        setSent(false);
        try {
            const result = await apiClient<any>(`/api/chat/search/${searchId}`);
            setSearchResult(result);
        } catch (error) {
            setSearchResult(null);
            addToast("未找到该用户");
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddFriend = async () => {
        if (!searchResult) return;
        setIsSubmitting(true);
        try {
            await apiClient("/api/chat/friend/request", {
                method: "POST",
                body: JSON.stringify({ friendId: searchResult.id })
            });
            setSent(true);
            addToast("好友申请已发送", <Check size={16} className="text-green-500" />);
        } catch (error) {
            console.error("Failed to add friend", error);
            addToast("申请发送失败或已是好友");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-md bg-[#181818] rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <UserPlus size={20} className="text-green-500" />
                            <h2 className="text-lg font-bold text-white">添加好友</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
                            <X size={18} className="text-neutral-400" />
                        </button>
                    </div>

                    <div className="p-6">
                        <div className="relative mb-6">
                            <input
                                type="text"
                                placeholder="输入用户名"
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full bg-neutral-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-green-500/50 transition-all font-medium"
                            />
                            <Search className="absolute left-3 top-3.5 text-neutral-500" size={16} />
                            {isSearching && <Loader2 className="absolute right-3 top-3.5 text-green-500 animate-spin" size={16} />}
                        </div>

                        {searchResult ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-5 group hover:border-green-500/30 transition-all duration-500 shadow-2xl backdrop-blur-md"
                            >
                                <Link
                                    href={`/${searchResult.username}`}
                                    onClick={onClose}
                                    className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-transparent group-hover:border-green-500/50 transition-all duration-500 shadow-2xl shrink-0 cursor-pointer"
                                >
                                    {searchResult.avatarPath ? (
                                        <Image
                                            src={getAuthenticatedSrc(searchResult.avatarPath)}
                                            alt={searchResult.displayName}
                                            fill
                                            sizes="64px"
                                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center font-black text-black text-2xl uppercase">
                                            {searchResult.username[0]}
                                        </div>
                                    )}
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link
                                        href={`/${searchResult.username}`}
                                        onClick={onClose}
                                        className="inline-block max-w-full"
                                    >
                                        <h3 className="text-white text-lg font-bold truncate hover:text-green-400 transition-colors cursor-pointer">{searchResult.displayName || searchResult.username}</h3>
                                    </Link>
                                    <p className="text-sm text-neutral-400 font-medium truncate">@{searchResult.username}</p>
                                    {searchResult.bio && (
                                        <p className="text-xs text-neutral-500 truncate mt-1 italic opacity-80 uppercase tracking-tighter grayscale group-hover:grayscale-0 transition-all">&quot;{searchResult.bio}&quot;</p>
                                    )}
                                </div>
                                <button
                                    onClick={handleAddFriend}
                                    disabled={isSubmitting || sent || searchResult.isMe || searchResult.id === currentUser?.id}
                                    className={`px-5 py-2.5 rounded-full text-sm font-black transition-all active:scale-95 flex items-center justify-center gap-2 ${sent || searchResult.isMe || searchResult.id === currentUser?.id
                                        ? "bg-neutral-800 text-neutral-500 border border-white/5 cursor-not-allowed"
                                        : "bg-green-500 text-black hover:bg-green-400 hover:scale-[1.02]"
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (searchResult.isMe || searchResult.id === currentUser?.id) ? (
                                        null
                                    ) : sent ? (
                                        <Check size={14} />
                                    ) : (
                                        <UserPlus size={14} />
                                    )}
                                    {searchResult.isMe || searchResult.id === currentUser?.id ? "自己" : sent ? "申请已发" : "添加"}
                                </button>
                            </motion.div>
                        ) : hasSearched ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-16 text-center bg-white/[0.02] rounded-2xl border border-white/5"
                            >
                                <div className="mb-4">
                                    <UserMinus size={40} className="text-neutral-800 mx-auto" />
                                </div>
                                <h3 className="text-xl font-black text-neutral-500 tracking-tight">空空如也</h3>
                                <p className="text-xs text-neutral-600 mt-2">未找到此用户</p>
                            </motion.div>
                        ) : (
                            <div className="py-16 text-center bg-white/[0.01] rounded-2xl border border-white/5">
                                <Search size={40} className="text-neutral-800 mx-auto mb-4" />
                                <p className="text-sm font-bold text-neutral-500 tracking-tight">通过用户名寻找你的朋友</p>
                            </div>
                        )}
                    </div>

                    <div className="px-6 pb-6 pt-0">
                        <button
                            onClick={onClose}
                            className="w-full py-3 text-sm font-bold text-neutral-400 hover:text-white transition-colors"
                        >
                            以后再说
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
