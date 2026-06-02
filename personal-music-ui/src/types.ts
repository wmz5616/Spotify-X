import { ReactNode } from "react";

export type Artist = {
  id: number;
  name: string;
  avatarUrl?: string | null;
  headerUrl?: string | null;
  albums?: Album[];
  bio?: string | null;
  bioImageUrl?: string | null;
  avatarPosition?: string | null;
  backgroundPosition?: string | null;
};

export type Album = {
  id: number;
  title: string;
  coverPath?: string | null;
  artists: Artist[];
  songs: Song[];
  _count: {
    songs: number;
  };
};

export type Song = {
  artist: string;
  year: ReactNode;
  id: number;
  title: string;
  trackNumber: number | null;
  duration?: number;
  lyrics?: string | null;
  album?: {
    id: number;
    title: string;
    coverPath?: string | null;
    artists: Artist[];
  };
};

export type Playlist = {
  id: number;
  name: string;
  songs: Song[];
  _count: {
    songs: number;
  };
};
