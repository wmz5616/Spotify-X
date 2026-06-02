"use client";

import React, { useEffect, useState } from "react";
import { 
    Users, 
    Mic2, 
    Disc, 
    Music, 
    TrendingUp, 
    Clock, 
    ShieldCheck,
    ArrowUpRight
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { motion } from "framer-motion";

interface Stats {
    userCount: number;
    artistCount: number;
    albumCount: number;
    songCount: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiClient<Stats>("/api/admin/stats");
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch stats:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    const cards = [
        { label: "注册用户", value: stats?.userCount || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "活跃艺术家", value: stats?.artistCount || 0, icon: Mic2, color: "text-green-500", bg: "bg-green-500/10" },
        { label: "专辑总数", value: stats?.albumCount || 0, icon: Disc, color: "text-purple-500", bg: "bg-purple-500/10" },
        { label: "曲库总量", value: stats?.songCount || 0, icon: Music, color: "text-orange-500", bg: "bg-orange-500/10" },
    ];

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-[#121212] rounded-2xl animate-pulse border border-white/5" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black text-white">仪表盘概览</h2>
                <p className="text-neutral-500 mt-2 font-medium">欢迎回来，管理员。这是您当前的系统状态摘要。</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-[#121212] p-6 rounded-2xl border border-white/5 shadow-xl hover:border-white/10 transition-colors group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${card.bg} p-3 rounded-xl transition-colors`}>
                                <card.icon className={`${card.color}`} size={24} />
                            </div>
                            <span className="text-xs font-bold text-neutral-600 group-hover:text-neutral-400 transition-colors cursor-default">实时更新</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl font-black text-white">{card.value.toLocaleString()}</p>
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{card.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Quick Actions or more charts could go here */}
               <div className="bg-[#121212] rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <TrendingUp className="text-green-500" />
                            快捷操作
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl text-left transition group/btn border border-white/0 hover:border-white/5">
                                <p className="font-bold text-sm mb-1">新增艺术家</p>
                                <p className="text-xs text-neutral-500">手动录入新艺人数据</p>
                                <ArrowUpRight className="absolute top-4 right-4 text-neutral-600 group-hover/btn:text-white transition-colors" size={16} />
                            </button>
                            <button className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl text-left transition group/btn border border-white/0 hover:border-white/5">
                                <p className="font-bold text-sm mb-1">系统扫描</p>
                                <p className="text-xs text-neutral-500">同步文件系统曲库</p>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-black">
                    <div className="flex flex-col h-full justify-between relative z-10">
                        <div>
                            <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
                                <ShieldCheck size={28} />
                                系统安全
                            </h3>
                            <p className="font-bold opacity-80 max-w-xs text-sm">
                                所有管理操作均已被记录在案。请确保在进行敏感操作前已核实相关数据。
                            </p>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mt-8">
                            Security Protocol Active • v2.0.4
                        </p>
                    </div>
                    {/* Decorative element */}
                    <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
                </div>
            </div>
        </div>
    );
}
