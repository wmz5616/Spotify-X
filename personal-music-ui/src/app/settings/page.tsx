"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Palette,
  Sun,
  Moon,
  Check,
  RotateCw,
  Loader2,
  Settings as SettingsIcon,
  ShieldAlert,
} from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { useToastStore } from "@/store/useToastStore";
import { useThemeStore, type ThemeMode } from "@/store/useThemeStore";
import clsx from "clsx";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type SettingsTab = "appearance" | "account";

export default function SettingsPage() {
  const { user, token, isAuthenticated, hasHydrated, updateSettings } =
    useUserStore();
  const { addToast } = useToastStore();
  const { mode, setMode, toggleTheme } = useThemeStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [isSaving, setIsSaving] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const isLight = mode === "light";

  const handleSelectTheme = async (selectedMode: "light" | "dark") => {
    setMode(selectedMode);
    if (token) {
      try {
        await updateSettings({ theme: selectedMode });
      } catch (err) {
        // 静默处理或忽略
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addToast("两次输入的密码不一致");
      return;
    }

    setIsSaving(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/user/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.message || "修改失败");
      }

      addToast("密码已修改");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      addToast(err.message || "密码修改失败");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "appearance" as const, label: "外观与主题", icon: Palette },
    { id: "account" as const, label: "账户安全", icon: Lock },
  ];

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white -mt-6 rounded-2xl overflow-hidden">
      {/* 头部标题区 */}
      <header className="px-4 sm:px-8 py-4 shrink-0 border-b border-white/5 bg-[#121212] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <SettingsIcon size={20} className="text-[#1ed760]" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">系统设置</h1>
        </div>
      </header>

      {/* 移动端专属横向分类胶囊（小于 md 屏幕显示） */}
      <div className="flex md:hidden items-center gap-2 px-4 py-3 border-b border-white/5 overflow-x-auto no-scrollbar bg-[#161618]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95",
              activeTab === tab.id
                ? "bg-[#1ed760] text-black font-bold shadow-md"
                : "bg-[#222225] text-neutral-300 hover:bg-[#28282c] border border-white/5"
            )}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* 桌面端左侧导航栏（大于等于 md 屏幕显示） */}
        <aside className="hidden md:block w-[220px] border-r border-white/5 py-4 shrink-0 bg-[#141416]">
          <nav className="px-3 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 text-left",
                  activeTab === tab.id
                    ? "bg-[#282828] text-white shadow-sm ring-1 ring-white/10"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon
                  size={18}
                  className={activeTab === tab.id ? "text-[#1ed760]" : ""}
                />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* 主内容区域 */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-[#121212]">
          <div className="max-w-2xl">
            <AnimatePresence mode="wait">
              {/* 1. 外观与主题（昼夜切换） */}
              {activeTab === "appearance" && (
                <motion.div
                  key="appearance"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <section className="space-y-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        昼夜显示模式
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1">
                        自定义 Spotify-X 的整体视觉风格，支持日间浅色模式与夜间深色模式自由切换。
                      </p>
                    </div>

                    {/* 昼夜一键切换大开关按钮 */}
                    <div className="bg-[#18181a] border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                      <div className="flex items-center gap-3">
                        <div
                          className={clsx(
                            "w-11 h-11 rounded-xl flex items-center justify-center transition-colors shrink-0",
                            isLight
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-blue-500/10 text-blue-400"
                          )}
                        >
                          {isLight ? (
                            <Sun size={22} className="animate-[spin_10s_linear_infinite]" />
                          ) : (
                            <Moon size={22} />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">
                            当前模式：{isLight ? "日间模式（浅色）" : "夜间模式（深色）"}
                          </div>
                          <div className="text-xs text-neutral-400 mt-0.5">
                            {isLight
                              ? "清爽明亮，适合白天与高光线环境"
                              : "沉浸护眼，适合暗光环境与夜间收听"}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={toggleTheme}
                        className={clsx(
                          "w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-md",
                          isLight
                            ? "bg-[#18181a] text-white hover:bg-[#202022] border border-white/10"
                            : "bg-white text-black hover:bg-neutral-200"
                        )}
                      >
                        <RotateCw size={14} />
                        <span>切换为{isLight ? "夜间模式" : "日间模式"}</span>
                      </button>
                    </div>

                    {/* 明暗视觉双卡片选择器 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {/* 日间模式卡片 */}
                      <div
                        onClick={() => handleSelectTheme("light")}
                        className={clsx(
                          "bg-[#18181a] hover:bg-[#202024] rounded-2xl p-4 border-2 cursor-pointer transition-all active:scale-98 flex flex-col justify-between group",
                          isLight
                            ? "border-[#1ed760] shadow-[0_0_15px_rgba(30,215,96,0.15)] ring-1 ring-[#1ed760]/30"
                            : "border-white/5 hover:border-white/20"
                        )}
                      >
                        {/* 迷你日间预览图 */}
                        <div className="w-full aspect-[16/9] rounded-xl bg-[#f4f5f7] border border-black/5 p-3 flex flex-col justify-between overflow-hidden shadow-inner">
                          <div className="flex items-center justify-between">
                            <div className="w-16 h-2.5 rounded-full bg-neutral-300" />
                            <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
                              <Sun size={10} className="text-white" />
                            </div>
                          </div>
                          <div className="space-y-1.5 my-auto">
                            <div className="w-3/4 h-2 rounded bg-neutral-300" />
                            <div className="w-1/2 h-2 rounded bg-neutral-200" />
                          </div>
                          <div className="w-full h-3 rounded-full bg-white border border-black/5 flex items-center px-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#1ed760]" />
                          </div>
                        </div>

                        {/* 标题与勾选 */}
                        <div className="flex items-center justify-between mt-3.5">
                          <div className="flex items-center gap-2">
                            <Sun size={16} className="text-amber-500" />
                            <span className="text-sm font-bold text-white">日间模式 (Light)</span>
                          </div>
                          {isLight && (
                            <span className="w-5 h-5 rounded-full bg-[#1ed760] text-black flex items-center justify-center">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 夜间模式卡片 */}
                      <div
                        onClick={() => handleSelectTheme("dark")}
                        className={clsx(
                          "bg-[#18181a] hover:bg-[#202024] rounded-2xl p-4 border-2 cursor-pointer transition-all active:scale-98 flex flex-col justify-between group",
                          !isLight
                            ? "border-[#1ed760] shadow-[0_0_15px_rgba(30,215,96,0.15)] ring-1 ring-[#1ed760]/30"
                            : "border-white/5 hover:border-white/20"
                        )}
                      >
                        {/* 迷你夜间预览图 */}
                        <div className="w-full aspect-[16/9] rounded-xl bg-[#0e0e10] border border-white/10 p-3 flex flex-col justify-between overflow-hidden shadow-inner">
                          <div className="flex items-center justify-between">
                            <div className="w-16 h-2.5 rounded-full bg-neutral-700" />
                            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                              <Moon size={10} className="text-white" />
                            </div>
                          </div>
                          <div className="space-y-1.5 my-auto">
                            <div className="w-3/4 h-2 rounded bg-neutral-700" />
                            <div className="w-1/2 h-2 rounded bg-neutral-800" />
                          </div>
                          <div className="w-full h-3 rounded-full bg-[#1c1c20] border border-white/5 flex items-center px-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#1ed760]" />
                          </div>
                        </div>

                        {/* 标题与勾选 */}
                        <div className="flex items-center justify-between mt-3.5">
                          <div className="flex items-center gap-2">
                            <Moon size={16} className="text-blue-400" />
                            <span className="text-sm font-bold text-white">夜间模式 (Dark)</span>
                          </div>
                          {!isLight && (
                            <span className="w-5 h-5 rounded-full bg-[#1ed760] text-black flex items-center justify-center">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </motion.div>
              )}

              {/* 2. 账户安全 */}
              {activeTab === "account" && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  {isAuthenticated ? (
                    <>
                      <section className="space-y-4">
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                            修改登录密码
                          </h3>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            定期修改密码可以提高您的 Spotify-X 账号安全性。
                          </p>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-neutral-300">
                              当前密码
                            </label>
                            <input
                              type="password"
                              required
                              value={passwordData.currentPassword}
                              onChange={(e) =>
                                setPasswordData({
                                  ...passwordData,
                                  currentPassword: e.target.value,
                                })
                              }
                              className="w-full bg-[#1a1a1c] border border-white/10 focus:border-[#1ed760] rounded-xl px-3.5 py-2 text-sm text-white outline-none transition-colors"
                              placeholder="输入原密码"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-neutral-300">
                              新密码
                            </label>
                            <input
                              type="password"
                              required
                              value={passwordData.newPassword}
                              onChange={(e) =>
                                setPasswordData({
                                  ...passwordData,
                                  newPassword: e.target.value,
                                })
                              }
                              className="w-full bg-[#1a1a1c] border border-white/10 focus:border-[#1ed760] rounded-xl px-3.5 py-2 text-sm text-white outline-none transition-colors"
                              placeholder="输入新密码"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-neutral-300">
                              确认新密码
                            </label>
                            <input
                              type="password"
                              required
                              value={passwordData.confirmPassword}
                              onChange={(e) =>
                                setPasswordData({
                                  ...passwordData,
                                  confirmPassword: e.target.value,
                                })
                              }
                              className="w-full bg-[#1a1a1c] border border-white/10 focus:border-[#1ed760] rounded-xl px-3.5 py-2 text-sm text-white outline-none transition-colors"
                              placeholder="再次输入新密码"
                            />
                          </div>

                          <div className="pt-2">
                            <button
                              type="submit"
                              disabled={isSaving}
                              className="bg-[#1ed760] hover:bg-[#1db954] text-black px-5 py-2 rounded-full text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                            >
                              {isSaving ? "正在更新..." : "更新密码"}
                            </button>
                          </div>
                        </form>
                      </section>

                      {/* 危险区域 */}
                      <div className="p-4 sm:p-5 rounded-2xl border border-red-500/20 bg-red-500/5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-red-400">注销账户</p>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            永久注销您的个人账户与所有收藏数据。
                          </p>
                        </div>
                        <button className="text-xs font-bold text-neutral-400 hover:text-red-400 px-3 py-1.5 rounded-full border border-white/5 hover:border-red-500/30 transition-colors">
                          注销账户
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-[#18181a] border border-white/5 rounded-2xl p-8 text-center space-y-3">
                      <p className="text-sm text-neutral-300">
                        您当前尚未登录，登录后即可管理账户安全与密码。
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
