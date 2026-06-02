"use client";

import React, { useEffect, useState } from "react";
import { 
    Mic2, 
    Plus, 
    Search, 
    MoreVertical, 
    Edit, 
    Trash2, 
    ExternalLink,
    Loader2
} from "lucide-react";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import ArtistEditorModal from "@/components/admin/ArtistEditorModal";
import { useToastStore } from "@/store/useToastStore";

interface Artist {
    id: number;
    name: string;
    avatarUrl?: string | null;
    headerUrl?: string | null;
    bio?: string | null;
    avatarPosition?: string | null;
    backgroundPosition?: string | null;
    _count?: {
        albums: number;
        followers: number;
    };
}

export default function ArtistManagement() {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToast } = useToastStore();

    const fetchArtists = async () => {
        try {
            const data = await apiClient<Artist[]>("/api/admin/artists");
            setArtists(data);
        } catch (error) {
            console.error("Failed to fetch artists:", error);
            addToast("获取艺术家列表失败", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchArtists();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm("确定要删除这位艺术家吗？这将不可撤销。")) return;
        try {
            await apiClient(`/api/admin/artists/${id}`, { method: "DELETE" });
            setArtists(artists.filter(a => a.id !== id));
            addToast("删除成功", "success");
        } catch (error) {
            addToast("删除失败", "error");
        }
    };

    const handleEdit = (artist: Artist) => {
        setSelectedArtist(artist);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedArtist(null);
        setIsModalOpen(true);
    };

    const filteredArtists = artists.filter(artist => 
        artist.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getAvatar = (path?: string | null) => {
        if (!path) return null;
        const cleanPath = path.startsWith("/public") ? path : `/public${path}`;
        return getAuthenticatedSrc(cleanPath);
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white">艺术家管理</h2>
                    <p className="text-neutral-500 font-medium">配置艺人资料、简介以及个性化的图像展示效果。</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-green-500 transition-colors" size={20} />
                        <input 
                            type="text"
                            placeholder="搜索艺术家..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-[#121212] border border-white/5 rounded-2xl py-3 pl-12 pr-6 w-full md:w-64 text-white outline-none focus:border-green-500/50 focus:ring-4 focus:ring-green-500/10 transition-all font-medium"
                        />
                    </div>
                    <button 
                        onClick={handleCreate}
                        className="bg-green-500 text-black px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition shadow-lg shadow-green-500/20"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">新增艺术家</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        [...Array(8)].map((_, i) => (
                            <div key={i} className="bg-[#121212] aspect-[3/4] rounded-3xl animate-pulse border border-white/5" />
                        ))
                    ) : filteredArtists.length > 0 ? (
                        filteredArtists.map((artist, i) => (
                            <motion.div
                                key={artist.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}
                                className="group bg-[#121212] rounded-3xl overflow-hidden border border-white/5 hover:border-white/10 transition-all shadow-xl hover:shadow-2xl flex flex-col relative"
                            >
                                {/* Header Preview */}
                                <div className="h-28 w-full relative bg-neutral-900 border-b border-white/5">
                                    <Image 
                                        src={artist.headerUrl ? getAvatar(artist.headerUrl)! : "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070&auto=format&fit=crop"}
                                        alt={artist.name} fill className="object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                                        style={{ objectPosition: artist.backgroundPosition || '50% 50%' }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent" />
                                </div>

                                {/* Avatar & Info */}
                                <div className="px-6 pb-6 -mt-10 flex flex-col items-center flex-1 relative z-10">
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4 border-4 border-[#121212] shadow-2xl bg-neutral-800 shrink-0">
                                        {artist.avatarUrl ? (
                                            <Image 
                                                src={getAvatar(artist.avatarUrl)!} 
                                                alt={artist.name} fill className="object-cover"
                                                style={{ objectPosition: artist.avatarPosition || '50% 50%' }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-neutral-500">
                                                <Mic2 size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-black text-white text-center truncate w-full group-hover:text-green-500 transition-colors uppercase tracking-tight">{artist.name}</h3>
                                    <p className="text-xs font-bold text-neutral-500 mt-1 uppercase tracking-widest">{artist._count?.albums || 0} 张专辑 • {artist._count?.followers || 0} 关注</p>
                                    
                                    <div className="mt-6 flex items-center gap-3 w-full">
                                        <button 
                                            onClick={() => handleEdit(artist)}
                                            className="flex-1 bg-white/5 hover:bg-white/10 text-white p-3 rounded-2xl flex items-center justify-center gap-2 transition font-bold text-xs"
                                        >
                                            <Edit size={16} />
                                            编辑资料
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(artist.id)}
                                            className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a href={`/artist/${encodeURIComponent(artist.name)}`} target="_blank" className="bg-black/40 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/60 transition block shadow-xl border border-white/5">
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center">
                            <p className="text-neutral-500 font-black uppercase tracking-widest">未找到相关艺术家</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <ArtistEditorModal 
                artist={selectedArtist}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onRefresh={fetchArtists}
            />
        </div>
    );
}
