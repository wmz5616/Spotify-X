"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Camera, Loader2, Move, Save, Trash2, Mic2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { getAuthenticatedSrc, apiClient } from "@/lib/api-client";
import { useToastStore } from "@/store/useToastStore";

interface Artist {
    id: number;
    name: string;
    avatarUrl?: string | null;
    headerUrl?: string | null;
    bio?: string | null;
    bioImageUrl?: string | null;
    avatarPosition?: string | null;
    backgroundPosition?: string | null;
}

interface ArtistEditorModalProps {
    artist: Artist | null; // null for creating new
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

export default function ArtistEditorModal({ artist, isOpen, onClose, onRefresh }: ArtistEditorModalProps) {
    const isNew = !artist;
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [avatarPosition, setAvatarPosition] = useState("50% 50%");
    const [backgroundPosition, setBackgroundPosition] = useState("50% 50%");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [adjustMode, setAdjustMode] = useState<"avatar" | "background" | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
    const [startObjPos, setStartObjPos] = useState({ x: 50, y: 50 });
    const { addToast } = useToastStore();

    useEffect(() => {
        if (isOpen && artist) {
            setName(artist.name || "");
            setBio(artist.bio || "");
            setAvatarPosition(artist.avatarPosition || "50% 50%");
            setBackgroundPosition(artist.backgroundPosition || "50% 50%");
        } else if (isOpen && isNew) {
            setName("");
            setBio("");
            setAvatarPosition("50% 50%");
            setBackgroundPosition("50% 50%");
        }
    }, [isOpen, artist, isNew]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = { name, bio, avatarPosition, backgroundPosition };
            if (isNew) {
                await apiClient("/api/admin/artists", { method: "POST", body: data });
                addToast("创建成功", "success");
            } else {
                await apiClient(`/api/admin/artists/${artist!.id}`, { method: "PUT", body: data });
                addToast("更新成功", "success");
            }
            onRefresh();
            onClose();
        } catch (error) {
            addToast("保存失败", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, type: "avatar" | "background") => {
        if (adjustMode !== type) return;
        e.preventDefault();
        setIsDragging(true);
        setDragStartPos({ x: e.clientX, y: e.clientY });
        const pos = type === "avatar" ? avatarPosition : backgroundPosition;
        const [px, py] = pos.split(' ').map((p: string) => parseFloat(p));
        setStartObjPos({ x: isNaN(px) ? 50 : px, y: isNaN(py) ? 50 : py });
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, type: "avatar" | "background") => {
        if (!isDragging || adjustMode !== type) return;
        const dx = e.clientX - dragStartPos.x;
        const dy = e.clientY - dragStartPos.y;
        const multiplier = -0.3;
        let newX = Math.max(0, Math.min(100, startObjPos.x + dx * multiplier));
        let newY = Math.max(0, Math.min(100, startObjPos.y + dy * multiplier));
        const newPos = `${newX.toFixed(1)}% ${newY.toFixed(1)}%`;
        type === "avatar" ? setAvatarPosition(newPos) : setBackgroundPosition(newPos);
    };

    const handleGlobalPointerUp = () => setIsDragging(false);

    useEffect(() => {
        window.addEventListener("pointerup", handleGlobalPointerUp);
        return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
    }, []);

    const getUrl = (path?: string | null) => {
        if (!path) return "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070&auto=format&fit=crop";
        const cleanPath = path.startsWith("/public") ? path : `/public${path}`;
        return getAuthenticatedSrc(cleanPath);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-[#181818] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-white/5 flex flex-col max-h-[90vh]"
                    >
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-md">
                            <h2 className="text-xl font-black text-white flex items-center gap-3">
                                <Mic2 className="text-green-500" />
                                {isNew ? "新建艺术家" : `正在编辑: ${artist?.name}`}
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition text-neutral-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                           
                            {/* Image Focus Adjusters */}
                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest px-1">图像聚焦与锚点调整</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Header Position */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">艺术家背景 (Header)</label>
                                            <span className="text-[10px] font-bold text-neutral-600 bg-white/5 px-2 py-0.5 rounded-md">{backgroundPosition}</span>
                                        </div>
                                        <div 
                                            className="h-44 rounded-2xl overflow-hidden relative group bg-neutral-900 border border-white/5 shadow-inner"
                                            onPointerDown={(e) => handlePointerDown(e, "background")}
                                            onPointerMove={(e) => handlePointerMove(e, "background")}
                                            style={{ cursor: adjustMode === "background" ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                                        >
                                            <Image 
                                                src={getUrl(artist?.headerUrl)} 
                                                alt="Header" fill className="object-cover transition-all duration-300"
                                                style={{ 
                                                    objectPosition: backgroundPosition,
                                                    opacity: adjustMode === "background" ? 1 : 0.4,
                                                    filter: adjustMode === "background" ? "none" : "grayscale(50%)"
                                                }}
                                            />
                                            
                                            {/* Grid Overlay during adjustment */}
                                            {adjustMode === "background" && (
                                                <div className="absolute inset-0 pointer-events-none">
                                                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 transition-opacity">
                                                        <div className="border border-white/30" /><div className="border border-white/30" /><div className="border border-white/30" />
                                                        <div className="border border-white/30" /><div className="border border-white/30" /><div className="border border-white/30" />
                                                        <div className="border border-white/30" /><div className="border border-white/30" /><div className="border border-white/30" />
                                                    </div>
                                                    {/* Center Crosshair */}
                                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center opacity-50">
                                                        <div className="absolute w-full h-[1px] bg-green-500" />
                                                        <div className="absolute h-full w-[1px] bg-green-500" />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="absolute inset-0 flex items-center justify-center">
                                                {adjustMode !== "background" ? (
                                                    <button type="button" onClick={() => setAdjustMode("background")} className="bg-white/90 text-black hover:bg-green-500 transition-all p-4 rounded-full shadow-2xl scale-0 group-hover:scale-100 transform duration-300 flex items-center gap-2 font-black text-xs">
                                                        <Move size={20} />
                                                        开始手动聚焦
                                                    </button>
                                                ) : (
                                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                                                        <p className="text-[10px] text-white font-black bg-black/60 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg mb-2">按住并拖动以调整焦点</p>
                                                        <button type="button" onClick={() => setAdjustMode(null)} className="bg-green-500 text-black px-6 py-2 rounded-full text-xs font-black shadow-xl hover:scale-105 active:scale-95 transition-all">锁定焦点</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Avatar Position */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">艺术家头像 (Avatar)</label>
                                            <span className="text-[10px] font-bold text-neutral-600 bg-white/5 px-2 py-0.5 rounded-md">{avatarPosition}</span>
                                        </div>
                                        <div 
                                            className="h-44 rounded-2xl overflow-hidden relative group bg-neutral-900 border border-white/5 flex items-center justify-center shadow-inner"
                                            onPointerDown={(e) => handlePointerDown(e, "avatar")}
                                            onPointerMove={(e) => handlePointerMove(e, "avatar")}
                                            style={{ cursor: adjustMode === "avatar" ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                                        >
                                            <div className="w-32 h-32 rounded-full overflow-hidden relative border-4 border-white/10 shadow-2xl transition-all duration-300 group-hover:border-white/20">
                                                <Image 
                                                    src={getUrl(artist?.avatarUrl)} 
                                                    alt="Avatar" fill className="object-cover transition-opacity duration-300"
                                                    style={{ 
                                                        objectPosition: avatarPosition,
                                                        opacity: adjustMode === "avatar" ? 1 : 0.4
                                                    }}
                                                />
                                                {/* Crosshair Overlay */}
                                                {adjustMode === "avatar" && (
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                                                        <div className="absolute w-6 h-[1px] bg-green-500" />
                                                        <div className="absolute h-6 w-[1px] bg-green-500" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="absolute inset-0 flex items-center justify-center">
                                                {adjustMode !== "avatar" ? (
                                                    <button type="button" onClick={() => setAdjustMode("avatar")} className="bg-white/90 text-black hover:bg-green-500 transition-all p-4 rounded-full shadow-2xl scale-0 group-hover:scale-100 transform duration-300 flex items-center gap-2 font-black text-xs">
                                                        <Move size={20} />
                                                        开始手动聚焦
                                                    </button>
                                                ) : (
                                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                                                        <p className="text-[10px] text-white font-black bg-black/60 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg mb-2">按住并拖动</p>
                                                        <button type="button" onClick={() => setAdjustMode(null)} className="bg-green-500 text-black px-6 py-2 rounded-full text-xs font-black shadow-xl hover:scale-105 active:scale-95 transition-all">锁定焦点</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest ml-1">名字</label>
                                    <input 
                                        type="text" 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white focus:border-green-500/50 outline-none transition"
                                        placeholder="例如: 周杰伦..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest ml-1">个人简介 (Biography)</label>
                                    <textarea 
                                        rows={5}
                                        value={bio} 
                                        onChange={(e) => setBio(e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white focus:border-green-500/50 outline-none transition resize-none custom-scrollbar"
                                        placeholder="输入艺术家的生平、音乐风格或其他描述..."
                                    />
                                </div>
                            </div>
                        </form>

                        <div className="p-8 border-t border-white/5 bg-white/5 flex justify-end gap-4">
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="px-8 py-3 text-neutral-400 font-bold hover:text-white transition"
                            >
                                取消
                            </button>
                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-12 py-3 bg-green-500 text-black font-black rounded-full hover:scale-105 active:scale-95 transition shadow-xl shadow-green-500/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                同步更改
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
