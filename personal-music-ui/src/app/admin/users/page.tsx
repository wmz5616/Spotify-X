"use client";

import React, { useEffect, useState } from "react";
import { 
    Users, 
    ShieldCheck, 
    User as UserIcon,
    MoreVertical,
    Search,
    Loader2,
    Check
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";
import { useToastStore } from "@/store/useToastStore";

interface User {
    id: number;
    email: string;
    username: string | null;
    displayName: string | null;
    role: string;
    createdAt: string;
}

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const { addToast } = useToastStore();

    const fetchUsers = async () => {
        try {
            const data = await apiClient<User[]>("/api/admin/users");
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users:", error);
            addToast("获取用户列表失败", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const toggleRole = async (userId: number, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        setUpdatingId(userId);
        try {
            await apiClient(`/api/admin/users/${userId}/role`, {
                method: "PUT",
                body: { role: newRole }
            });
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            addToast(`已将用户设为 ${newRole === 'admin' ? '管理员' : '普通用户'}`, "success");
        } catch (error) {
            addToast("更新权限失败", "error");
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredUsers = users.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.username?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (user.displayName?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white">用户管理</h2>
                    <p className="text-neutral-500 font-medium">查看和管理所有已注册的用户权限。</p>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-green-500 transition-colors" size={20} />
                    <input 
                        type="text"
                        placeholder="搜索用户..."
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
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest">用户信息</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest">角色状态</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest">注册时间</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        <AnimatePresence mode="popLayout">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-6"><div className="h-10 w-40 bg-white/5 rounded-lg" /></td>
                                        <td className="px-6 py-6"><div className="h-6 w-20 bg-white/5 rounded-full" /></td>
                                        <td className="px-6 py-6"><div className="h-6 w-24 bg-white/5 rounded-lg" /></td>
                                        <td className="px-6 py-6"><div className="h-10 w-10 bg-white/5 rounded-full ml-auto" /></td>
                                    </tr>
                                ))
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <motion.tr 
                                        key={user.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="hover:bg-white/[0.02] transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-green-500 group-hover:text-black transition-colors shrink-0">
                                                    {user.role === 'admin' ? <ShieldCheck size={20} /> : <UserIcon size={20} />}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="font-bold text-sm text-white truncate">{user.displayName || user.username || "未命名用户"}</p>
                                                    <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${
                                                user.role === 'admin' 
                                                ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                                                : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${user.role === 'admin' ? 'bg-green-500' : 'bg-blue-500'}`} />
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-medium text-neutral-400">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => toggleRole(user.id, user.role)}
                                                disabled={updatingId === user.id}
                                                className={`p-2 rounded-xl transition-all ${
                                                    user.role === 'admin'
                                                    ? "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"
                                                    : "bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-black"
                                                } disabled:opacity-50`}
                                            >
                                                {updatingId === user.id ? <Loader2 size={18} className="animate-spin" /> : (
                                                    <span className="text-xs font-black uppercase px-2">
                                                        {user.role === 'admin' ? '降级' : '设为管理'}
                                                    </span>
                                                )}
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-neutral-500 font-bold uppercase tracking-widest text-sm">
                                        未找到匹配的用户
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
