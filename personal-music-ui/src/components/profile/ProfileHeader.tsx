"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, Users, UserPlus, MessageCircle, Share2, Play, Quote, Settings, Link } from "lucide-react";
import { getAuthenticatedSrc } from "@/lib/api-client";
import { User } from "@/lib/prisma-types";
import { useChatStore } from "@/store/useChatStore";
import { useToastStore } from "@/store/useToastStore";

interface ProfileHeaderProps {
    user: User;
    isCurrentUser: boolean;
    isFollowing: boolean;
    onFollow: () => void;
    onUnfollow: () => void;
    onEditProfile: () => void;
    onTabChange?: (tab: string) => void;
    activeTab?: string;
}

export default function ProfileHeader({
    user,
    isCurrentUser,
    isFollowing,
    onFollow,
    onUnfollow,
    onEditProfile,
    onTabChange,
    activeTab,
}: ProfileHeaderProps) {
    const { startChatWith } = useChatStore();
    const addToast = useToastStore(state => state.addToast);
    const router = useRouter();

    const getAvatarUrl = () => {
        if (user.avatarPath) {
            return getAuthenticatedSrc(user.avatarPath);
        }
        return null;
    };

    const getBackgroundUrl = () => {
        if (user.backgroundPath) {
            return getAuthenticatedSrc(user.backgroundPath);
        }
        return "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070&auto=format&fit=crop";
    };

    const getInitial = () => {
        return (user.displayName || user.username || "?").charAt(0).toUpperCase();
    };

    return (
        <div className="relative w-full pb-8">
            {/* Background Cover */}
            <div className="h-72 md:h-[42vh] min-h-[320px] max-h-[500px] w-full relative">
                <Image
                    src={getBackgroundUrl()}
                    alt="背景图"
                    fill
                    sizes="100vw"
                    className="object-cover"
                    style={{ objectPosition: user.backgroundPosition || "50% 50%" }}
                    priority
                />
                {/* Smooth Gradient fading to standard background #121212 or black */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/60 to-transparent" />
            </div>

            <div className="max-w-[1500px] mx-auto px-6 md:px-10 -mt-28 md:-mt-36 relative z-10 flex flex-col">
                <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
                    {/* Avatar */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="relative shrink-0 self-start md:self-auto"
                    >
                        <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full scale-110" />
                        <div className="relative w-40 h-40 md:w-[230px] md:h-[230px] rounded-full overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.5)] border-0 ring-4 ring-black/20">
                            {getAvatarUrl() ? (
                                <Image
                                    src={getAvatarUrl()!}
                                    alt="头像"
                                    fill
                                    priority
                                    sizes="(max-width: 768px) 160px, 230px"
                                    className="object-cover"
                                    style={{ objectPosition: user.avatarPosition || "50% 50%" }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-700">
                                    <span className="text-6xl md:text-8xl font-black text-black/80">{getInitial()}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Profile Details */}
                    <div className="flex-1 flex flex-col justify-end pb-2 md:pb-3 gap-2 md:gap-3">
                        <div className="flex flex-col">
                            <motion.h1
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                                className="text-5xl md:text-7xl lg:text-[7rem] font-black text-white tracking-tighter leading-none -ml-1 md:-ml-2 py-1"
                            >
                                {user.displayName || user.username}
                            </motion.h1>
                            {user.displayName && (
                                <motion.p
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                                    className="text-white/40 text-lg md:text-2xl font-bold tracking-tight mt-1 md:mt-2"
                                >
                                    @{user.username}
                                </motion.p>
                            )}
                        </div>

                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex flex-wrap items-center gap-2 md:gap-3 mt-2 text-white/50 text-sm md:text-base font-medium"
                        >
                            {user.ipLocation && (
                                <>
                                    <span className="text-white/80">{user.ipLocation}</span>
                                    <span className="text-white/30">•</span>
                                </>
                            )}
                            <div 
                                onClick={() => onTabChange?.("followers")}
                                className={`hover:text-white cursor-pointer transition flex items-center gap-1 group px-2 py-1 rounded-md ${activeTab === "followers" ? "bg-white/10 text-white" : ""}`}
                            >
                                <span className="font-bold text-white group-hover:text-white transition">{(user as any)._count?.followers || 0}</span> 
                                <span className="text-white/70 group-hover:text-white transition">粉丝</span>
                            </div>
                            <span className="text-white/30">•</span>
                            <div 
                                onClick={() => onTabChange?.("following")}
                                className={`hover:text-white cursor-pointer transition flex items-center gap-1 group px-2 py-1 rounded-md ${activeTab === "following" ? "bg-white/10 text-white" : ""}`}
                            >
                                <span className="font-bold text-white group-hover:text-white transition">{(user as any)._count?.following || 0}</span> 
                                <span className="text-white/70 group-hover:text-white transition">关注</span>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Actions & Bio Row */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-8"
                >
                    <div className="flex items-center gap-3">
                        {isCurrentUser ? (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onEditProfile}
                                    className="px-5 py-2 md:px-7 md:py-2.5 bg-transparent border border-white/30 text-white font-bold rounded-full hover:scale-105 hover:border-white active:scale-95 transition-all text-sm md:text-base"
                                >
                                    编辑个人资料
                                </button>
                                <button
                                    onClick={() => {
                                        const url = window.location.href;
                                        navigator.clipboard.writeText(url);
                                        addToast("已复制个人主页链接", "success");
                                    }}
                                    className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-white/5 border border-white/10 text-white/70 rounded-full hover:scale-110 hover:bg-white/10 hover:text-white active:scale-95 transition-all shadow-lg group"
                                    title="复制链接"
                                >
                                    <Link size={18} className="group-hover:scale-110 transition-transform" />
                                </button>
                                <button
                                    onClick={() => {
                                        // Simple share logic using native share if available
                                        if (navigator.share) {
                                            navigator.share({
                                                title: (user.displayName || user.username) || undefined,
                                                url: window.location.href
                                            });
                                        } else {
                                            addToast("当前环境暂不支持原生分享", "info");
                                        }
                                    }}
                                    className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-white/5 border border-white/10 text-white/70 rounded-full hover:scale-110 hover:bg-white/10 hover:text-white active:scale-95 transition-all shadow-lg group"
                                    title="分享个人资料"
                                >
                                    <Share2 size={18} className="group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={isFollowing ? onUnfollow : onFollow}
                                    className={`px-5 py-2 md:px-7 md:py-2.5 font-bold rounded-full transition hover:scale-105 active:scale-95 text-sm md:text-base ${isFollowing
                                            ? "bg-transparent border border-white/30 text-white hover:border-white"
                                            : "bg-white text-black hover:bg-neutral-200"
                                        }`}
                                >
                                    {isFollowing ? "已关注" : "关注"}
                                </button>
                                <button
                                    onClick={() => startChatWith(user.id)}
                                    className="px-5 py-2 md:px-7 md:py-2.5 flex items-center gap-2 bg-neutral-800/80 border border-white/10 text-white font-bold rounded-full hover:scale-105 hover:border-white/30 active:scale-95 transition-all text-sm md:text-base shadow-lg"
                                >
                                    <MessageCircle size={18} />
                                    私信
                                </button>
                                <button
                                    onClick={() => {
                                        const url = window.location.href;
                                        navigator.clipboard.writeText(url);
                                        addToast("已复制个人主页链接", "success");
                                    }}
                                    className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-white/5 border border-white/10 text-white/70 rounded-full hover:scale-110 hover:bg-white/10 hover:text-white active:scale-95 transition-all shadow-lg group"
                                    title="复制链接"
                                >
                                    <Link size={18} className="group-hover:scale-110 transition-transform" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({
                                                title: (user.displayName || user.username) || undefined,
                                                url: window.location.href
                                            });
                                        } else {
                                            addToast("当前环境暂不支持原生分享", "info");
                                        }
                                    }}
                                    className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-white/5 border border-white/10 text-white/70 rounded-full hover:scale-110 hover:bg-white/10 hover:text-white active:scale-95 transition-all shadow-lg group"
                                    title="分享个人资料"
                                >
                                    <Share2 size={18} className="group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 max-w-2xl pl-1 md:pl-0">
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
