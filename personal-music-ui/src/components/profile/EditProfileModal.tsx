"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Camera, Loader2, Globe, ChevronDown, Move } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { getAuthenticatedSrc, apiClient } from "@/lib/api-client";
import { User } from "@/lib/prisma-types";
import { REGION_DATA } from "@/lib/region-data";
import { useUserStore } from "@/store/useUserStore";

interface EditProfileModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    onRefresh: () => void;
}

export default function EditProfileModal({ user, isOpen, onClose, onSave, onRefresh }: EditProfileModalProps) {
    const [displayName, setDisplayName] = useState(user.displayName || "");
    const [ipLocation, setIpLocation] = useState(user.ipLocation || "");
    const [avatarPosition, setAvatarPosition] = useState(user.avatarPosition || "50% 50%");
    const [backgroundPosition, setBackgroundPosition] = useState(user.backgroundPosition || "50% 50%");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState<"avatar" | "background" | null>(null);
    const [adjustMode, setAdjustMode] = useState<"avatar" | "background" | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
    const [startObjPos, setStartObjPos] = useState({ x: 50, y: 50 });
    const [isRegionOpen, setIsRegionOpen] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const backgroundInputRef = useRef<HTMLInputElement>(null);
    const regionDropdownRef = useRef<HTMLDivElement>(null);
    const fetchUser = useUserStore(state => state.fetchUser);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target as Node)) {
                setIsRegionOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setDisplayName(user.displayName || "");
            setIpLocation(user.ipLocation || "");
            setAvatarPosition(user.avatarPosition || "50% 50%");
            setBackgroundPosition(user.backgroundPosition || "50% 50%");
        }
    }, [isOpen, user]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "background") => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(type);
        const formData = new FormData();
        formData.append(type, file);

        try {
            await apiClient(`/api/user/${type}`, {
                method: "POST",
                body: formData,
            });
            await fetchUser();
            onRefresh();
            setAdjustMode(type);
        } catch (error) {
            console.error(`Upload ${type} failed:`, error);
        } finally {
            setIsUploading(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave({
                displayName,
                ipLocation,
                avatarPosition,
                backgroundPosition
            });
            await fetchUser();
            onClose();
        } catch (error) {
            console.error("Failed to update profile:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getAvatarUrl = () => {
        if (user.avatarPath) {
            const path = user.avatarPath.startsWith("/public") ? user.avatarPath : `/public${user.avatarPath}`;
            return getAuthenticatedSrc(path);
        }
        return null;
    };

    const getBackgroundUrl = () => {
        if (user.backgroundPath) {
            const path = user.backgroundPath.startsWith("/public") ? user.backgroundPath : `/public${user.backgroundPath}`;
            return getAuthenticatedSrc(path);
        }
        return "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070&auto=format&fit=crop";
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, type: "avatar" | "background") => {
        if (adjustMode !== type) return;
        e.preventDefault();
        setIsDragging(true);
        setDragStartPos({ x: e.clientX, y: e.clientY });
        const pos = type === "avatar" ? avatarPosition : backgroundPosition;
        const [x, y] = pos.split(' ').map((p: string) => parseFloat(p));
        setStartObjPos({ x: isNaN(x) ? 50 : x, y: isNaN(y) ? 50 : y });
        document.body.style.cursor = "grabbing";
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, type: "avatar" | "background") => {
        if (!isDragging || adjustMode !== type) return;
        const dx = e.clientX - dragStartPos.x;
        const dy = e.clientY - dragStartPos.y;

        const multiplierX = -0.3;
        const multiplierY = -0.3;

        let newX = Math.max(0, Math.min(100, startObjPos.x + dx * multiplierX));
        let newY = Math.max(0, Math.min(100, startObjPos.y + dy * multiplierY));

        const newPos = `${newX.toFixed(1)}% ${newY.toFixed(1)}%`;
        if (type === "avatar") {
            setAvatarPosition(newPos);
        } else {
            setBackgroundPosition(newPos);
        }
    };

    const handleGlobalPointerUp = () => {
        if (isDragging) {
            setIsDragging(false);
            document.body.style.cursor = "default";
        }
    };

    useEffect(() => {
        window.addEventListener("pointerup", handleGlobalPointerUp);
        return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
    }, [isDragging]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-[#181818] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-neutral-800"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-neutral-800 bg-[#282828]/50">
                            <h2 className="text-xl font-bold text-white">编辑个人资料</h2>
                            <button onClick={onClose} className="p-2 hover:bg-neutral-700/50 rounded-full transition">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">

                            <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "avatar")} />
                            <input type="file" ref={backgroundInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "background")} />

                            <div className="relative group/all pt-2">
                                <div
                                    className="h-44 w-full rounded-2xl overflow-hidden relative group border border-neutral-800 bg-neutral-900"
                                    onPointerDown={(e) => handlePointerDown(e, "background")}
                                    onPointerMove={(e) => handlePointerMove(e, "background")}
                                    style={{
                                        cursor: adjustMode === "background" ? (isDragging ? 'grabbing' : 'grab') : 'default',
                                        touchAction: adjustMode === "background" ? 'none' : 'auto'
                                    }}
                                >
                                    <Image
                                        src={getBackgroundUrl()}
                                        alt="Background"
                                        fill
                                        sizes="(max-width: 768px) 100vw, 800px"
                                        className="object-cover transition-opacity duration-300"
                                        style={{
                                            objectPosition: backgroundPosition,
                                            opacity: adjustMode === "background" ? 1 : 0.6
                                        }}
                                    />

                                    {adjustMode !== "background" ? (
                                        <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/10 group-hover:bg-black/30 transition">
                                            <button
                                                type="button"
                                                onClick={() => backgroundInputRef.current?.click()}
                                                className="bg-black/60 p-3 rounded-full backdrop-blur-md transform hover:scale-110 active:scale-95 transition flex items-center gap-2 text-white border border-white/10"
                                            >
                                                {isUploading === "background" ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAdjustMode("background")}
                                                className="bg-green-500/80 p-3 rounded-full backdrop-blur-md transform hover:scale-110 active:scale-95 transition flex items-center gap-2 text-black font-bold border border-green-400/20"
                                                title="调整位置"
                                            >
                                                <Move size={24} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 bg-transparent flex flex-col items-center justify-end pb-4 pointer-events-none animate-in fade-in duration-300">
                                            <div className="bg-black/80 px-4 py-2 rounded-full border border-green-500/50 flex items-center gap-4 shadow-2xl pointer-events-auto">
                                                <span className="text-sm text-white font-medium">拖拽图片以调整焦点</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setAdjustMode(null)}
                                                    className="bg-green-500 text-black px-4 py-1.5 rounded-full text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition"
                                                >
                                                    更换
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="absolute -bottom-10 left-10">
                                    <div className="relative group/avatar">
                                        <div
                                            className="w-32 h-32 rounded-full border-8 border-[#181818] overflow-hidden relative bg-neutral-900 shadow-2xl"
                                            onPointerDown={(e) => handlePointerDown(e, "avatar")}
                                            onPointerMove={(e) => handlePointerMove(e, "avatar")}
                                            style={{
                                                cursor: adjustMode === "avatar" ? (isDragging ? 'grabbing' : 'grab') : 'default',
                                                touchAction: adjustMode === "avatar" ? 'none' : 'auto'
                                            }}
                                        >
                                            {getAvatarUrl() ? (
                                                <Image
                                                    src={getAvatarUrl()!}
                                                    alt="Avatar"
                                                    fill
                                                    sizes="128px"
                                                    className="object-cover transition-opacity duration-300"
                                                    style={{
                                                        objectPosition: avatarPosition,
                                                        opacity: adjustMode === "avatar" ? 1 : 0.8
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-4xl font-black text-black">
                                                    {(user.displayName || user.username || "?")[0].toUpperCase()}
                                                </div>
                                            )}

                                            {adjustMode !== "avatar" ? (
                                                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/20 group-hover/avatar:bg-black/40 transition opacity-0 group-hover/avatar:opacity-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => avatarInputRef.current?.click()}
                                                        className="p-2 bg-black/60 rounded-full text-white hover:scale-110 transition border border-white/10"
                                                    >
                                                        {isUploading === "avatar" ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAdjustMode("avatar")}
                                                        className="p-2 bg-green-500/80 rounded-full text-black hover:scale-110 transition border border-green-400/20"
                                                    >
                                                        <Move size={18} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="absolute inset-0 bg-transparent flex flex-col items-center justify-end pb-6 pointer-events-none">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAdjustMode(null)}
                                                        className="mt-2 bg-green-500 text-black px-4 py-1 rounded-full text-xs font-black pointer-events-auto shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-green-400/50 hover:bg-green-400 hover:scale-105 active:scale-95 transition"
                                                    >
                                                        更换
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 pt-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">昵称</label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            placeholder="输入你的昵称"
                                            className="w-full bg-[#282828] border border-neutral-800 rounded-lg p-3 text-white placeholder:text-neutral-600 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition shadow-sm"
                                        />
                                    </div>

                                    <div className="space-y-2" ref={regionDropdownRef}>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1 text-blue-400">地区</label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsRegionOpen(!isRegionOpen)}
                                                className="w-full bg-[#282828] border border-neutral-800 rounded-lg py-3 pl-4 pr-4 text-white hover:border-neutral-700 hover:bg-[#2e2e2e] focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none transition-all duration-300 text-left flex items-center justify-between group shadow-sm"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Globe size={18} className="text-blue-500 group-hover:text-blue-400 group-hover:scale-110 transition-all duration-300" />
                                                    <span className="font-medium">{ipLocation || <span className="text-neutral-500">选择您的所在地区</span>}</span>
                                                </div>
                                                <div className={`p-1 rounded-full bg-neutral-800/50 group-hover:bg-neutral-800 transition-colors ${isRegionOpen ? "bg-blue-500/20 text-blue-400" : ""}`}>
                                                    <ChevronDown size={16} className={`text-neutral-400 transition-transform duration-300 ${isRegionOpen ? "rotate-180 text-blue-400" : ""}`} />
                                                </div>
                                            </button>

                                            <AnimatePresence>
                                                {isRegionOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 4, scale: 1 }}
                                                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                                        className="absolute z-[100] w-full bg-[#181818]/95 backdrop-blur-xl border border-neutral-700/50 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden"
                                                    >
                                                        <div className="max-h-[250px] overflow-y-auto custom-scrollbar p-3 space-y-4">
                                                            <div>
                                                                <div 
                                                                    onClick={() => { setIpLocation(""); setIsRegionOpen(false); }}
                                                                    className={`px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-2 transition-all duration-200 ${ipLocation === "" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "text-neutral-300 hover:bg-neutral-800/80 hover:text-white border border-transparent"}`}
                                                                >
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${ipLocation === "" ? "bg-blue-400" : "bg-neutral-600"}`} />
                                                                    未知地点
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="space-y-2">
                                                                <div className="px-1 text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                                                                    <span className="w-8 h-[1px] bg-neutral-800"></span>
                                                                    国内 - 大陆
                                                                    <span className="flex-1 h-[1px] bg-neutral-800"></span>
                                                                </div>
                                                                <div className="grid grid-cols-4 gap-1.5 pr-1">
                                                                    {REGION_DATA.domestic.mainland.map(region => (
                                                                        <div
                                                                            key={region}
                                                                            onClick={() => { setIpLocation(region); setIsRegionOpen(false); }}
                                                                            className={`px-1 py-2 rounded-md cursor-pointer text-xs text-center font-medium transition-all duration-200 ${ipLocation === region ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105" : "text-neutral-400 bg-neutral-800/40 hover:bg-neutral-700 hover:text-white hover:scale-105 active:scale-95"}`}
                                                                        >
                                                                            {region}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2 pt-2">
                                                                <div className="px-1 text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                                                                    <span className="w-8 h-[1px] bg-neutral-800"></span>
                                                                    国内 - 港澳台
                                                                    <span className="flex-1 h-[1px] bg-neutral-800"></span>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-2 pr-1">
                                                                    {[REGION_DATA.domestic.hongkong, REGION_DATA.domestic.macau, REGION_DATA.domestic.taiwan].map(region => (
                                                                        <div
                                                                            key={region}
                                                                            onClick={() => { setIpLocation(region); setIsRegionOpen(false); }}
                                                                            className={`px-2 py-2.5 rounded-lg cursor-pointer text-xs text-center font-medium transition-all duration-200 ${ipLocation === region ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105" : "text-neutral-400 bg-neutral-800/40 hover:bg-neutral-700 hover:text-white hover:scale-105 active:scale-95"}`}
                                                                        >
                                                                            {region}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-4 pt-2">
                                                                <div className="px-1 text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                                                                    <span className="w-8 h-[1px] bg-neutral-800"></span>
                                                                    海外
                                                                    <span className="flex-1 h-[1px] bg-neutral-800"></span>
                                                                </div>
                                                                {REGION_DATA.overseas.map(continent => (
                                                                    <div key={continent.continent} className="space-y-1.5 pl-1">
                                                                        <div className="text-[11px] font-medium text-neutral-400">{continent.continent}</div>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {continent.countries.map(country => (
                                                                                <div
                                                                                    key={country}
                                                                                    onClick={() => { setIpLocation(country); setIsRegionOpen(false); }}
                                                                                    className={`px-3 py-1.5 rounded-full cursor-pointer text-[11px] font-medium transition-all duration-200 ${ipLocation === country ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105" : "text-neutral-400 bg-neutral-800/40 border border-neutral-700/50 hover:bg-neutral-700 hover:text-white hover:border-neutral-600 hover:scale-105 active:scale-95"}`}
                                                                                >
                                                                                    {country}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-neutral-800">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-8 py-2.5 text-white font-bold hover:scale-105 transition rounded-full hover:bg-neutral-800 active:scale-95"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || isUploading !== null}
                                    className="px-10 py-2.5 bg-green-500 text-black font-black rounded-full hover:scale-105 active:scale-95 transition shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "同步更新"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
