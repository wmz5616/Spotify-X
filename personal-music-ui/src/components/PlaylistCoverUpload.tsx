"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Loader2, Trash2, Music } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { useToastStore } from "@/store/useToastStore";
import Image from "next/image";
import { CLIENT_API_BASE_URL as API_BASE_URL } from "@/lib/api-client";

interface PlaylistCoverUploadProps {
    playlistId: number;
    currentCoverPath?: string | null;
    onCoverChange: (newCoverPath: string | null) => void;
}

export default function PlaylistCoverUpload({
    playlistId,
    currentCoverPath,
    onCoverChange,
}: PlaylistCoverUploadProps) {
    const [isHovering, setIsHovering] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { token } = useUserStore();
    const { addToast } = useToastStore();

    const coverUrl = currentCoverPath
        ? `${API_BASE_URL}/public${currentCoverPath}`
        : null;

    const handleUpload = async (file: File) => {
        if (!token) {
            addToast("请先登录");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("cover", file);

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/user-playlists/${playlistId}/cover`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            if (response.ok) {
                const data = await response.json();
                onCoverChange(data.coverPath);
                addToast("封面已更新");
            } else {
                addToast("上传失败");
            }
        } catch (error) {
            console.error("Upload error:", error);
            addToast("上传失败");
        } finally {
            setIsUploading(false);
            setShowOptions(false);
        }
    };

    const handleDelete = async () => {
        if (!token) return;

        setIsUploading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/user-playlists/${playlistId}/cover`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                onCoverChange(null);
                addToast("封面已删除");
            } else {
                addToast("删除失败");
            }
        } catch (error) {
            console.error("Delete error:", error);
            addToast("删除失败");
        } finally {
            setIsUploading(false);
            setShowOptions(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                addToast("图片大小不能超过 5MB");
                return;
            }
            handleUpload(file);
        }
    };

    return (
        <div
            className="relative w-48 h-48 lg:w-56 lg:h-56 flex-shrink-0 rounded-md shadow-2xl overflow-hidden group cursor-pointer"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => {
                setIsHovering(false);
                setShowOptions(false);
            }}
            onClick={() => setShowOptions(!showOptions)}
        >
            {coverUrl ? (
                <Image
                    src={coverUrl}
                    alt="歌单封面"
                    fill
                    className="object-cover"
                    unoptimized
                />
            ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                    <Music size={64} className="text-neutral-600" />
                </div>
            )}

            <AnimatePresence>
                {(isHovering || showOptions) && !isUploading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center"
                    >
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fileInputRef.current?.click();
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm transition"
                            >
                                <Camera size={18} />
                                {currentCoverPath ? "更换封面" : "上传封面"}
                            </button>

                            {currentCoverPath && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete();
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white text-sm transition"
                                >
                                    <Trash2 size={18} />
                                    删除封面
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {isUploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader2 className="animate-spin text-white" size={32} />
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
}
