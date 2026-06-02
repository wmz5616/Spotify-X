"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Settings,
    LogOut,
    Heart,
    Clock,
    ListMusic,
    ChevronRight,
    ShieldCheck
} from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import AuthModal from "./AuthModal";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function UserMenu() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState<"login" | "register">("login");
    const menuRef = useRef<HTMLDivElement>(null);

    const { user, isAuthenticated, logout, fetchUser, token } = useUserStore();
    const { initializeFavorites, reset: resetFavorites } = useFavoritesStore();

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchUser();
            initializeFavorites();
        }
    }, [isAuthenticated, token]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        resetFavorites();
        setIsOpen(false);
        router.push("/");
    };

    const openLogin = () => {
        setAuthMode("login");
        setShowAuthModal(true);
        setIsOpen(false);
    };

    const openRegister = () => {
        setAuthMode("register");
        setShowAuthModal(true);
        setIsOpen(false);
    };

    const getAvatarUrl = () => {
        if (user?.avatarPath) {
            return getAuthenticatedSrc(user.avatarPath);
        }
        return null;
    };

    const getDisplayName = () => {
        return user?.displayName || user?.username || user?.email?.split("@")[0] || "用户";
    };

    const getInitial = () => {
        const name = getDisplayName();
        return name.charAt(0).toUpperCase();
    };

    return (
        <>
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 bg-black/40 p-1 pr-3 rounded-full hover:bg-neutral-800 transition border border-transparent hover:border-neutral-700/50 group"
                    title={getDisplayName()}
                >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-black/20 shadow-sm relative z-10">
                        {isAuthenticated && getAvatarUrl() ? (
                            <Image
                                src={getAvatarUrl()!}
                                alt="用户头像"
                                width={32}
                                height={32}
                                className="object-cover w-full h-full"
                                style={{ objectPosition: (user as any)?.avatarPosition || "50% 50%" }}
                            />
                        ) : isAuthenticated ? (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-green-700">
                                <span className="font-bold text-xs text-black">
                                    {getInitial()}
                                </span>
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-600 to-neutral-800">
                                <User size={16} className="text-neutral-300" />
                            </div>
                        )}
                    </div>

                    {isAuthenticated && (
                        <span className="text-sm font-bold text-white max-w-[100px] truncate hidden md:block group-hover:text-white/90">
                            {getDisplayName()}
                        </span>
                    )}

                    {!isAuthenticated && (
                        <span className="text-sm font-bold text-neutral-300 hidden md:block">
                            未登录
                        </span>
                    )}
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-12 w-56 bg-neutral-800 rounded-lg shadow-xl border border-neutral-700 overflow-hidden z-50"
                        >
                            {isAuthenticated ? (
                                <>
                                    <div className="p-4 border-b border-neutral-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-green-600">
                                                {getAvatarUrl() ? (
                                                    <Image
                                                        src={getAvatarUrl()!}
                                                        alt="用户头像"
                                                        width={40}
                                                        height={40}
                                                        className="object-cover w-full h-full"
                                                        style={{ objectPosition: (user as any)?.avatarPosition || "50% 50%" }}
                                                    />
                                                ) : (
                                                    <span className="font-bold text-lg text-black">
                                                        {getInitial()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-semibold truncate">
                                                    {getDisplayName()}
                                                </p>
                                                <p className="text-neutral-400 text-xs truncate">
                                                    {user?.email}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="py-2">
                                        <Link
                                            href={`/${user?.username}`}
                                            onClick={() => setIsOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-700/50 transition font-bold"
                                        >
                                            <User size={18} />
                                            <span>个人主页</span>
                                            <ChevronRight size={16} className="ml-auto text-neutral-500" />
                                        </Link>

                                        <Link
                                            href="/favorites"
                                            onClick={() => setIsOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-700/50 transition"
                                        >
                                            <Heart size={18} />
                                            <span>我的收藏</span>
                                            <ChevronRight size={16} className="ml-auto text-neutral-500" />
                                        </Link>

                                        <Link
                                            href="/history"
                                            onClick={() => setIsOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-700/50 transition"
                                        >
                                            <Clock size={18} />
                                            <span>播放历史</span>
                                            <ChevronRight size={16} className="ml-auto text-neutral-500" />
                                        </Link>

                                        <Link
                                            href="/playlists"
                                            onClick={() => setIsOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-700/50 transition"
                                        >
                                            <ListMusic size={18} />
                                            <span>我的歌单</span>
                                            <ChevronRight size={16} className="ml-auto text-neutral-500" />
                                        </Link>

                                        {user?.role === 'admin' && (
                                            <Link
                                                href="/admin"
                                                onClick={() => setIsOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-green-500 hover:bg-green-500/10 transition font-black"
                                            >
                                                <ShieldCheck size={18} />
                                                <span>管理后台</span>
                                                <ChevronRight size={16} className="ml-auto text-green-500/50" />
                                            </Link>
                                        )}
                                    </div>

                                    <div className="border-t border-neutral-700 py-2">
                                        <Link
                                            href="/settings"
                                            onClick={() => setIsOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-700/50 transition"
                                        >
                                            <Settings size={18} />
                                            <span>设置</span>
                                        </Link>

                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-700/50 transition"
                                        >
                                            <LogOut size={18} />
                                            <span>退出登录</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="py-2">
                                    <button
                                        onClick={openLogin}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-neutral-700/50 transition font-medium"
                                    >
                                        <User size={18} />
                                        <span>登录</span>
                                    </button>

                                    <button
                                        onClick={openRegister}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-neutral-300 hover:text-white hover:bg-neutral-700/50 transition"
                                    >
                                        <User size={18} />
                                        <span>注册账户</span>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                initialMode={authMode}
            />
        </>
    );
}
