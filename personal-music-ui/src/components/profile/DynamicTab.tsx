"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Calendar, Share2, Heart, MessageCircle, Send, Loader2, X } from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow, isSameDay, format, differenceInMinutes } from "date-fns";
import { zhCN } from "date-fns/locale";
import { getAuthenticatedSrc, apiClient } from "@/lib/api-client";
import { useToastStore } from "@/store/useToastStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useUserStore } from "@/store/useUserStore";
import Link from "next/link";
import { useRef } from "react";
import clsx from "clsx";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface FeedPost {
    id: number;
    content?: string;
    type: string;
    targetId?: number;
    createdAt: string;
    updatedAt: string;
    images?: string[];
    song?: any;
    isLiked?: boolean;
    _count?: { likes: number; comments: number };
    user: {
        id: number;
        username: string;
        displayName: string;
        avatarPath?: string;
    };
}

interface DynamicTabProps {
    feed: FeedPost[];
    isLoading: boolean;
    onLike?: (postId: number, isLiked: boolean) => void;
}

export default function DynamicTab({ feed, isLoading, onLike }: DynamicTabProps) {
    const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
    const [commentsMap, setCommentsMap] = useState<Record<number, any[]>>({});
    const [loadingComments, setLoadingComments] = useState<Record<number, boolean>>({});
    const [newComment, setNewComment] = useState<Record<number, string>>({});
    const [submittingComment, setSubmittingComment] = useState<Record<number, boolean>>({});
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [editingPostId, setEditingPostId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [postToDelete, setPostToDelete] = useState<number | null>(null);
    const commentInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

    const addToast = useToastStore(state => state.addToast);
    const playSong = usePlayerStore(state => state.playSong);
    const user = useUserStore(state => state.user);

    const toggleComments = async (postId: number) => {
        const isExpanded = !expandedComments[postId];
        setExpandedComments(prev => ({ ...prev, [postId]: isExpanded }));

        if (isExpanded && !commentsMap[postId]) {
            setLoadingComments(prev => ({ ...prev, [postId]: true }));
            try {
                const comments = await apiClient<any[]>(`/api/social/feed/${postId}/comments`);
                setCommentsMap(prev => ({ ...prev, [postId]: comments }));
            } catch (error) {
                console.error("Failed to fetch comments", error);
            } finally {
                setLoadingComments(prev => ({ ...prev, [postId]: false }));
            }
        }
    };

    const handlePostComment = async (postId: number) => {
        const content = newComment[postId]?.trim();
        if (!content) return;

        setSubmittingComment(prev => ({ ...prev, [postId]: true }));
        try {
            const comment = await apiClient<any>(`/api/social/feed/${postId}/comment`, {
                method: "POST",
                body: JSON.stringify({ content })
            });

            setCommentsMap(prev => ({
                ...prev,
                [postId]: [comment, ...(prev[postId] || [])]
            }));
            setNewComment(prev => ({ ...prev, [postId]: "" }));
        } catch (error) {
            console.error("Failed to post comment", error);
            addToast("评论失败", <MessageCircle size={16} />);
        } finally {
            setSubmittingComment(prev => ({ ...prev, [postId]: false }));
        }
    };

    const handleReply = (postId: number, username: string, displayName: string) => {
        const mention = `@${displayName || username} `;
        setNewComment(prev => ({
            ...prev,
            [postId]: (prev[postId] || "").includes(mention) ? prev[postId] : mention + (prev[postId] || "")
        }));

        // Focus the input
        setTimeout(() => {
            commentInputRefs.current[postId]?.focus();
        }, 0);
    };

    const handleShare = (postId: number) => {
        const post = feed.find(p => p.id === postId);
        const url = `${window.location.origin}/${post?.user.username || ""}`;
        navigator.clipboard.writeText(url)
            .then(() => addToast("分享链接已复制", <Share2 size={16} className="text-green-500" />))
            .catch(() => addToast("无法复制链接"));
    };

    const handleUpdatePost = async (postId: number) => {
        if (!editContent.trim()) return;
        setIsUpdating(true);
        try {
            await apiClient(`/api/social/feed/${postId}`, {
                method: "PUT",
                body: JSON.stringify({ content: editContent })
            });
            addToast("动态已更新", <Send size={16} />);
            setEditingPostId(null);
            // Refresh feed or update local state
            // For now we rely on the parent to refresh or we could update the feed prop if it was mutable (it's not)
            // But since this is a "confirm" result, we might need a refresh callback
            window.location.reload();
        } catch (error) {
            console.error("Failed to update post", error);
            addToast("更新失败");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeletePost = (postId: number) => {
        setPostToDelete(postId);
    };

    const executeDelete = async (postId: number) => {
        try {
            await apiClient(`/api/social/feed/${postId}`, {
                method: "DELETE"
            });
            addToast("动态已删除");
            window.location.reload();
        } catch (error) {
            console.error("Failed to delete post", error);
            addToast("删除失败");
        }
    };

    const renderCommentContent = (content: string, postId: number) => {
        const mentionRegex = /^(@[^\s]+)\s/;
        const match = content.match(mentionRegex);

        if (match) {
            const mention = match[1];
            const rest = content.slice(mention.length);
            return (
                <div className="flex flex-col gap-1">
                    <span
                        onClick={() => {
                            const displayName = mention.slice(1);
                            // We don't have the user ID for the mention here easily without backend changes 
                            // but we can at least make it look like a tag.
                        }}
                        className="inline-flex items-center self-start px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20 mb-1 hover:bg-green-500/20 transition cursor-default"
                    >
                        {mention}
                    </span>
                    <span>{rest}</span>
                </div>
            );
        }
        return content;
    };

    const formatCommentDate = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diffMinutes = differenceInMinutes(now, d);

        if (diffMinutes < 5) return "刚刚";

        if (isSameDay(d, now)) {
            return format(d, "HH:mm");
        }

        return format(d, "MM-dd HH:mm");
    };

    const inputRef = useRef<HTMLInputElement>(null);

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-8">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex flex-col gap-4">
                        <div className="h-20 bg-neutral-800 rounded-xl" />
                    </div>
                ))}
            </div>
        );
    }

    if (feed.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500 gap-4">
                <Calendar size={48} className="text-neutral-700" />
                <p className="text-lg font-medium">暂时没有动态</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 px-4 md:px-8 pb-20 max-w-4xl">
            {feed.map((post, index) => (
                <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-6 hover:bg-neutral-800/40 transition-all duration-300"
                >
                    <div className="flex gap-4">
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <Link
                                    href={`/${post.user.username}`}
                                    className="font-bold text-white transition-colors hover:text-green-400 cursor-pointer"
                                >
                                    {post.user.displayName || post.user.username}
                                </Link>
                                <span className="text-neutral-500 text-xs">•</span>
                                <span className="text-neutral-500 text-xs">
                                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: zhCN })}
                                </span>
                                {post.updatedAt && new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > 60000 && (
                                    <span className="text-neutral-500 text-[10px] bg-white/5 px-1.5 py-0.5 rounded">
                                        编辑于 {format(new Date(post.updatedAt), "HH:mm")}
                                    </span>
                                )}

                                {user?.id === post.user.id && (
                                    <div className="ml-auto flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingPostId(post.id);
                                                setEditContent(post.content || "");
                                            }}
                                            className="text-neutral-500 hover:text-white text-[10px] font-bold transition"
                                        >
                                            编辑
                                        </button>
                                        <button
                                            onClick={() => handleDeletePost(post.id)}
                                            className="text-neutral-500 hover:text-red-400 text-[10px] font-bold transition"
                                        >
                                            删除
                                        </button>
                                    </div>
                                )}
                            </div>

                            {editingPostId === post.id ? (
                                <div className="mb-4 space-y-3">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full bg-neutral-800 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-green-500/50 transition-all resize-none min-h-[100px]"
                                        placeholder="想要修改什么？"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setEditingPostId(null)}
                                            className="px-4 py-1.5 rounded-full text-xs font-bold text-neutral-400 hover:text-white transition"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={() => handleUpdatePost(post.id)}
                                            disabled={isUpdating || !editContent.trim()}
                                            className="px-4 py-1.5 rounded-full text-xs font-bold bg-green-500 text-black hover:bg-green-400 transition flex items-center gap-2"
                                        >
                                            {isUpdating && <Loader2 size={12} className="animate-spin" />}
                                            保存
                                        </button>
                                    </div>
                                </div>
                            ) : post.content && (
                                <p className="text-neutral-200 text-base mb-4 leading-relaxed whitespace-pre-wrap word-break-all">
                                    {post.content}
                                </p>
                            )}

                            {/* Images */}
                            {post.images && post.images.length > 0 && (
                                <div className={`grid gap-2 mb-4 ${post.images.length === 1 ? 'grid-cols-1 md:w-2/3' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                    {post.images.map((url: string, i: number) => (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedImage(url)}
                                            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer shadow-lg hover:opacity-90 transition border border-white/5"
                                        >
                                            <Image
                                                src={getAuthenticatedSrc(url)}
                                                alt="Attachment"
                                                fill
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                className="object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Post Type Specific Rendering */}
                            {post.type === "song" && post.song && (
                                <div
                                    onClick={() => playSong(post.song)}
                                    className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-4 group/item hover:bg-white/10 transition-all cursor-pointer mb-4 w-full md:w-2/3 shadow-sm hover:shadow-md active:scale-[0.98]"
                                >
                                    <div className="relative w-14 h-14 bg-neutral-800 rounded-lg overflow-hidden shadow-lg group-hover/item:scale-105 transition flex items-center justify-center">
                                        {post.song.album?.coverPath ? (
                                            <Image
                                                src={getAuthenticatedSrc(post.song.album.coverPath)}
                                                alt={post.song.title}
                                                fill
                                                sizes="56px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <Music size={24} className="text-green-500" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                            <Music size={20} className="text-green-500" />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-hidden flex flex-col justify-center">
                                        <p className="text-white font-bold truncate text-sm flex items-center gap-2">
                                            {post.song.title}
                                            <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">点击播放</span>
                                        </p>
                                        <div className="text-neutral-400 text-xs truncate mt-0.5 flex gap-1">
                                            {post.song.album?.artists && post.song.album.artists.length > 0 ? (
                                                post.song.album.artists.map((artist: any, i: number) => (
                                                    <React.Fragment key={artist.id}>
                                                        <Link
                                                            href={`/artist/${encodeURIComponent(artist.name)}`}
                                                            className="hover:underline hover:text-white transition-colors"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {artist.name}
                                                        </Link>
                                                        {i < (post.song.album?.artists?.length || 0) - 1 && ", "}
                                                    </React.Fragment>
                                                ))
                                            ) : (
                                                <span>{post.song.artist || '未知歌手'}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {post.type === "song" && !post.song && (
                                <div className="bg-[#181818] border border-neutral-800 rounded-xl p-3 flex items-center gap-4 group/item hover:bg-[#282828] transition cursor-pointer mb-4 w-full md:w-2/3 shadow-md">
                                    <div className="w-14 h-14 bg-neutral-800 rounded-lg flex items-center justify-center shadow-lg group-hover/item:scale-105 transition">
                                        <Music size={24} className="text-green-500" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-white font-bold truncate">分享了一首歌曲</p>
                                        <p className="text-neutral-400 text-sm truncate">歌曲已失效或数据缺失</p>
                                    </div>
                                </div>
                            )}

                            {/* Stats */}
                            <div className="flex items-center gap-6 mt-6 text-neutral-400">
                                <button
                                    onClick={() => onLike && onLike(post.id, !!post.isLiked)}
                                    className={`flex items-center gap-1.5 transition group/icon ${post.isLiked ? 'text-green-500' : 'hover:text-white'}`}
                                >
                                    <Heart size={18} fill={post.isLiked ? "currentColor" : "none"} className="group-hover/icon:scale-110 transition active:scale-90" />
                                    <span className="text-sm font-medium">{post._count?.likes || '点赞'}</span>
                                </button>
                                <button
                                    onClick={() => toggleComments(post.id)}
                                    className={`flex items-center gap-1.5 transition group/icon ${expandedComments[post.id] ? 'text-white' : 'hover:text-white'}`}
                                >
                                    <MessageCircle size={18} className="group-hover/icon:scale-110 transition" />
                                    <span className="text-sm font-medium">{post._count?.comments || '评论'}</span>
                                </button>
                                <button
                                    onClick={() => handleShare(post.id)}
                                    className="flex items-center gap-1.5 hover:text-green-400 transition group/icon ml-auto"
                                >
                                    <Share2 size={18} className="group-hover/icon:scale-110 transition" />
                                </button>
                            </div>

                            {/* Comment Section */}
                            {expandedComments[post.id] && (
                                <div className="mt-4 pt-4 border-t border-neutral-800/50 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {/* Input Field */}
                                    <div className="flex items-center gap-3 mb-6 bg-neutral-900/50 p-1.5 rounded-2xl border border-white/5 focus-within:border-green-500/40 focus-within:bg-neutral-900/80 transition-all duration-300 group/input">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 shrink-0 border border-white/5 shadow-inner ml-1">
                                            {user?.avatarPath ? (
                                                <Image src={getAuthenticatedSrc(user.avatarPath)} alt="Me" width={32} height={32} className="object-cover w-full h-full" style={{ objectPosition: user.avatarPosition || '50% 50%' }} />
                                            ) : (
                                                <div className="w-full h-full bg-green-500 flex items-center justify-center text-black font-bold text-xs uppercase">{user?.displayName?.[0] || user?.username?.[0] || '?'}</div>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            ref={el => { commentInputRefs.current[post.id] = el; }}
                                            value={newComment[post.id] || ''}
                                            onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                                            onKeyDown={(e) => e.key === 'Enter' && handlePostComment(post.id)}
                                            placeholder="写下你的评论..."
                                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-600 text-neutral-200 py-2 px-1"
                                        />
                                        <button
                                            onClick={() => handlePostComment(post.id)}
                                            disabled={!newComment[post.id]?.trim() || submittingComment[post.id]}
                                            className="p-2 mr-1 bg-green-500 hover:bg-green-400 disabled:bg-neutral-800 disabled:text-neutral-600 text-black rounded-xl transition-all duration-300 active:scale-90 shadow-lg"
                                        >
                                            {submittingComment[post.id] ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        </button>
                                    </div>

                                    {/* Comments List */}
                                    <div className="space-y-1 relative pr-2">
                                        {loadingComments[post.id] ? (
                                            <div className="flex justify-center py-6 text-neutral-600"><Loader2 className="animate-spin" size={20} /></div>
                                        ) : commentsMap[post.id]?.length === 0 ? (
                                            <p className="text-center text-xs text-neutral-500 py-8 font-medium tracking-wide">暂无评论，来开启一段精彩对话吧</p>
                                        ) : (
                                            <div className="space-y-0 relative">
                                                {commentsMap[post.id]?.map((comment: any, idx: number) => {
                                                    const isReply = comment.content.startsWith('@');
                                                    const nextComment = commentsMap[post.id]?.[idx + 1];
                                                    const hasNextReply = nextComment?.content.startsWith('@');

                                                    return (
                                                        <div key={comment.id} className="relative group/row">
                                                            {/* Vertical Thread Line */}
                                                            {((!isReply && hasNextReply) || (isReply && hasNextReply)) && (
                                                                <div className="absolute left-4 top-10 bottom-0 w-[1.5px] bg-neutral-800/60 z-0" />
                                                            )}

                                                            <div className={clsx(
                                                                "flex gap-3 relative py-3 px-1 transition-all duration-200 rounded-xl group/comment",
                                                                isReply ? "ml-10" : "hover:bg-white/[0.015]"
                                                            )}>
                                                                {/* L-Shaped Connector for Replies */}
                                                                {isReply && (
                                                                    <div className="absolute -left-6 top-0 bottom-7 w-6 border-l-[1.5px] border-b-[1.5px] border-neutral-800/60 rounded-bl-[10px] z-0" />
                                                                )}

                                                                {/* Avatar */}
                                                                <Link
                                                                    href={`/${comment.user.username}`}
                                                                    className={clsx(
                                                                        "rounded-full overflow-hidden shrink-0 bg-neutral-900 border border-white/5 hover:opacity-80 transition-all z-10 self-start shadow-sm",
                                                                        isReply ? "w-6 h-6 mt-1" : "w-9 h-9"
                                                                    )}
                                                                >
                                                                    {comment.user.avatarPath ? (
                                                                        <Image
                                                                            src={getAuthenticatedSrc(comment.user.avatarPath)}
                                                                            alt="Avatar"
                                                                            width={isReply ? 24 : 36}
                                                                            height={isReply ? 24 : 36}
                                                                            className="object-cover w-full h-full"
                                                                            style={{ objectPosition: comment.user.avatarPosition || '50% 50%' }}
                                                                        />
                                                                    ) : (
                                                                        <div className={clsx(
                                                                            "w-full h-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-black font-bold",
                                                                            isReply ? "text-[10px]" : "text-xs"
                                                                        )}>
                                                                            {comment.user.displayName?.[0] || comment.user.username?.[0] || '?'}
                                                                        </div>
                                                                    )}
                                                                </Link>

                                                                {/* Content */}
                                                                <div className="flex-1 min-w-0 pr-2 pt-0.5">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <Link
                                                                            href={`/${comment.user.username}`}
                                                                            className="font-bold text-neutral-100 text-[13px] hover:text-green-400 transition-colors"
                                                                        >
                                                                            {comment.user.displayName || comment.user.username}
                                                                        </Link>
                                                                        <span className="text-neutral-600 text-[10px] font-medium tracking-tight mt-0.5">{formatCommentDate(comment.createdAt)}</span>

                                                                        <button
                                                                            onClick={() => handleReply(post.id, comment.user.username, comment.user.displayName)}
                                                                            className="ml-auto flex items-center gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity bg-white/[0.05] hover:bg-green-500/10 text-neutral-400 hover:text-green-400 px-3 py-1 rounded-full text-[11px] font-bold border border-transparent hover:border-green-500/20 active:scale-95"
                                                                        >
                                                                            <MessageCircle size={12} className="mt-[-1px]" />
                                                                            回复
                                                                        </button>
                                                                    </div>
                                                                    <div className="text-neutral-300 text-[13.5px] leading-relaxed whitespace-pre-wrap font-medium">
                                                                        {renderCommentContent(comment.content, post.id)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            ))}

            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedImage(null)}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-8 cursor-pointer"
                    >
                        <button
                            className="absolute top-4 right-4 md:top-8 md:right-8 w-12 h-12 flex items-center justify-center bg-black/50 text-white rounded-full hover:bg-neutral-800 transition"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(null);
                            }}
                        >
                            <X size={24} />
                        </button>
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            src={getAuthenticatedSrc(selectedImage)}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            alt="Preview"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={postToDelete !== null}
                onClose={() => setPostToDelete(null)}
                onConfirm={() => postToDelete && executeDelete(postToDelete)}
                title="确认删除"
                message="确定要删除这条动态吗？删除后将无法找回。"
                confirmText="删除"
                cancelText="取消"
                type="danger"
            />
        </div>
    );
}
