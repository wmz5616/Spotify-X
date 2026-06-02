"use client";

import React, { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
    LayoutDashboard, 
    Users, 
    Mic2, 
    Disc, 
    Settings, 
    ArrowLeft,
    ShieldCheck
} from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, hasHydrated } = useUserStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (hasHydrated) {
            if (!isAuthenticated || user?.role !== 'admin') {
                router.push("/");
            }
        }
    }, [hasHydrated, isAuthenticated, user, router]);

    if (!hasHydrated || !user || user.role !== 'admin') {
        return (
            <div className="h-full w-full bg-black flex items-center justify-center text-white">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <ShieldCheck size={48} className="text-green-500" />
                    <p className="font-bold tracking-widest uppercase text-xs">验证管理员权限...</p>
                </div>
            </div>
        );
    }

    const navItems = [
        { label: "仪表盘", icon: LayoutDashboard, href: "/admin" },
        { label: "用户管理", icon: Users, href: "/admin/users" },
        { label: "艺术家管理", icon: Mic2, href: "/admin/artists" },
        { label: "专辑管理", icon: Disc, href: "/admin/albums" },
    ];

    return (
        <div className="flex h-full bg-[#0a0a0a] text-white overflow-hidden">
            {/* Admin Sidebar */}
            <aside className="w-64 bg-[#121212] border-r border-white/5 flex flex-col shadow-2xl z-50">
                <div className="p-6 border-b border-white/5 flex items-center gap-3">
                    <div className="bg-green-500 p-2 rounded-lg">
                        <ShieldCheck size={24} className="text-black" />
                    </div>
                    <div>
                        <h1 className="font-black text-lg tracking-tight">管理后台</h1>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Super Admin</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group ${
                                    isActive 
                                    ? "bg-green-500 text-black font-black shadow-lg shadow-green-500/20" 
                                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <item.icon size={20} className={isActive ? "text-black" : "group-hover:scale-110 transition-transform"} />
                                <span className="text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5 space-y-2">
                    <Link
                        href="/"
                        className="flex items-center gap-4 px-4 py-3 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm">返回音乐播放器</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-16 border-b border-white/5 bg-[#121212]/50 backdrop-blur-md flex items-center justify-between px-8 z-40">
                    <div className="flex items-center gap-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">
                        <span>主页</span>
                        <span>/</span>
                        <span className="text-white">{navItems.find(i => i.href === pathname)?.label || "管理概览"}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-white">{user.displayName || user.username}</span>
                            <span className="text-[10px] text-green-500 font-black uppercase">Online</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 overflow-hidden">
                             {/* User Avatar Placeholder */}
                             <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold">
                                {user.displayName?.[0] || user.username?.[0]}
                             </div>
                        </div>
                    </div>
                </header>

                <section className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-gradient-to-b from-[#121212] to-black">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="max-w-7xl mx-auto"
                    >
                        {children}
                    </motion.div>
                </section>
            </main>
        </div>
    );
}
