"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, ListMusic, Play, Trash2, Edit2 } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Song } from "@/types";
import ConfirmModal from "@/components/ui/ConfirmModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface UserPlaylist {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  coverPath?: string | null;
  createdAt: string;
  _count?: {
    songs: number;
  };
  songs?: {
    song: Song;
    order: number;
  }[];
}

export default function PlaylistsPage() {
  const router = useRouter();
  const { token, isAuthenticated, hasHydrated } = useUserStore();
  const { playSong } = usePlayerStore();
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [editingPlaylist, setEditingPlaylist] = useState<UserPlaylist | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const fetchPlaylists = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/user-playlists`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPlaylists(data);
      }
    } catch (error) {
      console.error("获取歌单失败:", error);
    }
    setIsLoading(false);
  }, [token]);

  useEffect(() => {
    if (isHydrated && isAuthenticated && token) {
      fetchPlaylists();
    }
  }, [isHydrated, isAuthenticated, token, fetchPlaylists]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/user-playlists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newPlaylistName.trim() }),
      });

      if (response.ok) {
        const newPlaylist = await response.json();
        setPlaylists([newPlaylist, ...playlists]);
        setNewPlaylistName("");
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error("创建歌单失败:", error);
    }
  };

  const handleDeletePlaylist = (playlistId: number) => {
    setPlaylistToDelete(playlistId);
  };

  const executeDeletePlaylist = async (playlistId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user-playlists/${playlistId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setPlaylists(playlists.filter((p) => p.id !== playlistId));
      }
    } catch (error) {
      console.error("删除歌单失败:", error);
    }
  };

  const handleUpdatePlaylist = async () => {
    if (!editingPlaylist || !token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/user-playlists/${editingPlaylist.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editingPlaylist.name }),
      });

      if (response.ok) {
        setPlaylists(playlists.map((p) => (p.id === editingPlaylist.id ? editingPlaylist : p)));
        setEditingPlaylist(null);
      }
    } catch (error) {
      console.error("更新歌单失败:", error);
    }
  };

  useEffect(() => {
    if (showCreateModal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCreateModal]);

  if (!isHydrated || !hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-neutral-400">
        <ListMusic size={48} className="mb-4 opacity-50" />
        <p>请先登录查看您的歌单</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-32">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg flex items-center justify-center shadow-lg">
              <ListMusic size={32} className="text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">我的歌单</h1>
              <p className="text-neutral-400">{playlists.length} 个歌单</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold py-2.5 px-5 rounded-full transition"
          >
            <Plus size={20} />
            <span>新建歌单</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-20 text-neutral-400">
            <ListMusic size={48} className="mx-auto mb-4 opacity-50" />
            <p>还没有创建歌单</p>
            <p className="text-sm mt-2">点击上方按钮创建你的第一个歌单</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {playlists.map((playlist, index) => (
              <motion.div
                key={playlist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group p-4 bg-neutral-800/50 rounded-lg hover:bg-neutral-700/50 transition cursor-pointer relative"
                onClick={() => router.push(`/playlist/${playlist.id}`)}
              >
                <div className="aspect-square relative rounded-md overflow-hidden mb-4 bg-neutral-700 flex items-center justify-center">
                  {playlist.coverPath ? (
                    <Image
                      src={`${API_BASE_URL}/public${playlist.coverPath}`}
                      alt={playlist.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <ListMusic size={48} className="text-neutral-500" />
                  )}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition transform translate-y-2 group-hover:translate-y-0">
                    <button className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition">
                      <Play size={24} className="text-black ml-1" fill="black" />
                    </button>
                  </div>
                </div>
                <p className="text-white font-medium truncate">{playlist.name}</p>
                <p className="text-neutral-400 text-sm truncate">
                  {playlist._count?.songs || 0} 首歌曲
                </p>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPlaylist(playlist);
                    }}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-600/50 rounded-full transition mr-1"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlaylist(playlist.id);
                    }}
                    className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-800 rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-white mb-4">新建歌单</h2>
            <input
              ref={inputRef}
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
              placeholder="输入歌单名称..."
              className="w-full bg-neutral-700 border border-neutral-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-green-500 transition"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPlaylistName("");
                }}
                className="flex-1 py-2.5 text-neutral-400 hover:text-white transition"
              >
                取消
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-neutral-600 disabled:text-neutral-400 text-black font-bold py-2.5 rounded-full transition"
              >
                创建
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {editingPlaylist && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-800 rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-white mb-4">编辑歌单</h2>
            <input
              type="text"
              value={editingPlaylist.name}
              onChange={(e) => setEditingPlaylist({ ...editingPlaylist, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleUpdatePlaylist()}
              className="w-full bg-neutral-700 border border-neutral-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-green-500 transition"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setEditingPlaylist(null)}
                className="flex-1 py-2.5 text-neutral-400 hover:text-white transition"
              >
                取消
              </button>
              <button
                onClick={handleUpdatePlaylist}
                className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold py-2.5 rounded-full transition"
              >
                保存
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmModal
        isOpen={playlistToDelete !== null}
        onClose={() => setPlaylistToDelete(null)}
        onConfirm={() => playlistToDelete && executeDeletePlaylist(playlistToDelete)}
        title="确认删除歌单"
        message="确定要删除这个歌单吗？此操作不可撤销。"
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />
    </div>
  );
}
