"use client";

import React, { useEffect, useState } from "react";
import { 
    Disc, 
    Search, 
    Edit, 
    Trash2, 
    Music,
    Users,
    Loader2
} from "lucide-react";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useToastStore } from "@/store/useToastStore";

interface Album {
    id: number;
    title: string;
    coverPath?: string | null;
    artists: { name: string }[];
    _count: { songs: number };
}

export default function AlbumManagement() {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const { addToast } = useToastStore();

    const fetchAlbums = async () => {
        try {
            const data = await apiClient<Album[]>("/api/admin/albums");
            setAlbums(data);
        } catch (error) {
            console.error("Failed to fetch albums:", error);
            addToast("获取专辑列表失败", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAlbums();
    }, []);

    const filteredAlbums = albums.filter(album => 
        album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        album.artists.some(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getCover = (path?: string | null) => {
        if (!path) return "/images/album_placeholder.png";
        const cleanPath = path.startsWith("/public") ? path : `/public${path}`;
        return getAuthenticatedSrc(cleanPath);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white">专辑管理</h2>
                    <p className="text-neutral-500 font-medium">查看并维护系统内的音乐专辑元数据。</p>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-green-500 transition-colors" size={20} />
                    <input 
                        type="text"
                        placeholder="搜索专辑或艺人..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#121212] border border-white/5 rounded-2xl py-3 pl-12 pr-6 w-full md:w-80 text-white outline-none focus:border-green-500/50 focus:ring-4 focus:ring-green-500/10 transition-all"
                    />
                </div>
            </div>

            <div className="bg-[#121212] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/5">
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest">专辑</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest">艺术家</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest">歌曲数量</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest text-right">管理</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        <AnimatePresence mode="popLayout">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-6"><div className="h-10 w-40 bg-white/5 rounded-lg" /></td>
                                        <td className="px-6 py-6"><div className="h-6 w-24 bg-white/5 rounded-lg" /></td>
                                        <td className="px-6 py-6"><div className="h-6 w-16 bg-white/5 rounded-lg" /></td>
                                        <td className="px-6 py-6"><div className="h-10 w-10 bg-white/5 rounded-full ml-auto" /></td>
                                    </tr>
                                ))
                            ) : filteredAlbums.length > 0 ? (
                                filteredAlbums.map((album) => (
                                    <motion.tr 
                                        key={album.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="hover:bg-white/[0.02] transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-neutral-800 border border-white/5 overflow-hidden relative shadow-lg group-hover:scale-105 transition-transform shrink-0">
                                                    <Image 
                                                        src={getCover(album.coverPath)} 
                                                        alt={album.title} 
                                                        fill 
                                                        className="object-cover" 
                                                        unoptimized
                                                    />
                                                </div>
                                                <p className="font-bold text-sm text-white truncate max-w-[200px]">{album.title}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-neutral-400">
                                                <Users size={14} className="text-neutral-600" />
                                                <span className="text-xs font-bold truncate max-w-[150px]">
                                                    {album.artists.map(a => a.name).join(", ")}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-neutral-400">
                                                <Music size={14} className="text-neutral-600" />
                                                <span className="text-xs font-bold">{album._count.songs} 首</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 bg-white/5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-xl transition">
                                                <Edit size={18} />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-neutral-500 font-bold uppercase tracking-widest text-sm">
                                        未找到匹配的专辑
                                    </td>
                                </tr>
                            )}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
