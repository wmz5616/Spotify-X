"use client";

import React, { useState } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  Play,
  ListPlus,
  CornerDownRight,
  Copy,
  User,
  Disc,
  Check,
  Heart,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { useToastStore } from "@/store/useToastStore";
import type { Song } from "@/types";
import AddToPlaylistModal from "./AddToPlaylistModal";

interface SongContextMenuProps {
  children: React.ReactNode;
  song: Song;
}

const SongContextMenu = ({ children, song }: SongContextMenuProps) => {
  const router = useRouter();
  const { playSong, addToQueue, insertNext } = usePlayerStore();
  const { favoriteSongIds, toggleFavoriteSong } = useFavoritesStore();
  const { addToast } = useToastStore();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const isFavorited = favoriteSongIds.has(song.id);

  const handlePlay = () => {
    playSong(song);
  };

  const handleAddToQueue = () => {
    addToQueue(song);
    addToast("已添加到播放队列");
  };

  const handlePlayNext = () => {
    insertNext(song);
    addToast("将在下一首播放");
  };

  const handleToggleFavorite = async () => {
    await toggleFavoriteSong(song.id);
    addToast(isFavorited ? "已取消收藏" : "已添加到收藏");
  };

  const handleGoToArtist = () => {
    if (song.album?.artists?.[0]?.name) {
      router.push(`/artist/${encodeURIComponent(song.album.artists[0].name)}`);
    }
  };

  const handleGoToAlbum = () => {
    if (song.album?.id) {
      router.push(`/album/${song.album.id}`);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/album/${song.album?.id}`;
    navigator.clipboard.writeText(link);
    addToast("链接已复制", <Check size={16} />);
  };

  const itemClass =
    "group text-sm text-white leading-none flex items-center h-[35px] px-[10px] relative select-none outline-none data-[highlighted]:bg-[#3e3e3e] data-[highlighted]:text-white rounded-[3px] cursor-default gap-3";

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Content className="min-w-[220px] bg-[#282828] rounded-md overflow-hidden p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,23,24,0.35),0px_10px_20px_-15px_rgba(22,23,24,0.2)] border border-[#3e3e3e] animate-in fade-in zoom-in-95 duration-200 z-[100]">
            <ContextMenu.Item className={itemClass} onSelect={handlePlay}>
              <Play size={16} />
              播放
            </ContextMenu.Item>

            <ContextMenu.Item className={itemClass} onSelect={handlePlayNext}>
              <CornerDownRight size={16} />
              下一首播放
            </ContextMenu.Item>

            <ContextMenu.Item className={itemClass} onSelect={handleAddToQueue}>
              <ListPlus size={16} />
              添加到播放队列
            </ContextMenu.Item>

            <ContextMenu.Separator className="h-[1px] bg-[#3e3e3e] m-[5px]" />

            <ContextMenu.Item
              className={itemClass}
              onSelect={handleToggleFavorite}
            >
              <Heart
                size={16}
                className={isFavorited ? "fill-green-500 text-green-500" : ""}
              />
              {isFavorited ? "取消收藏" : "添加到收藏"}
            </ContextMenu.Item>

            <ContextMenu.Item
              className={itemClass}
              onSelect={() => setShowPlaylistModal(true)}
            >
              <ListPlus size={16} />
              添加到歌单
            </ContextMenu.Item>

            <ContextMenu.Separator className="h-[1px] bg-[#3e3e3e] m-[5px]" />

            <ContextMenu.Item
              className={itemClass}
              onSelect={handleGoToArtist}
              disabled={!song.album?.artists?.[0]}
            >
              <User size={16} />
              查看艺术家
            </ContextMenu.Item>

            <ContextMenu.Item
              className={itemClass}
              onSelect={handleGoToAlbum}
              disabled={!song.album?.id}
            >
              <Disc size={16} />
              查看专辑
            </ContextMenu.Item>

            <ContextMenu.Separator className="h-[1px] bg-[#3e3e3e] m-[5px]" />

            <ContextMenu.Item className={itemClass} onSelect={handleCopyLink}>
              <Copy size={16} />
              复制歌曲链接
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      <AddToPlaylistModal
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        songId={song.id}
        songTitle={song.title}
      />
    </>
  );
};

export default SongContextMenu;
