"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Play, AlertCircle, UserPlus, UserCheck, Check } from "lucide-react";
import type { Song, Album, Artist } from "@/types";
import AlbumCard from "@/components/AlbumCard";
import PopularSongsList from "@/components/PopularSongsList";
import AboutCard from "@/components/AboutCard";
import clsx from "clsx";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { useToastStore } from "@/store/useToastStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ArtistDetails = Artist & {
  albums: (Album & { songs: Song[]; artists: Artist[] })[];
};

const ArtistPageSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-[40vh] bg-neutral-800 rounded-lg" />
    <div className="p-8">
      <div className="h-32 w-32 bg-neutral-700 rounded-full mb-8 -mt-20 border-4 border-black relative z-10"></div>
      <section className="mb-12">
        <div className="h-8 w-32 bg-neutral-700 rounded mb-6"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 w-full bg-neutral-800/50 rounded-md"
            ></div>
          ))}
        </div>
      </section>
    </div>
  </div>
);

const ArtistDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const [artist, setArtist] = useState<ArtistDetails | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const { playSong } = usePlayerStore();
  const { followedArtistIds, toggleFollowArtist, initializeFavorites } = useFavoritesStore();
  const { addToast } = useToastStore();

  useEffect(() => {
    if (artist && followedArtistIds) {
      setIsFollowing(followedArtistIds.has(artist.id));
    }
  }, [artist?.id, followedArtistIds]);



  const handleToggleFollow = async () => {
    if (!artist?.id) return;
    setFollowLoading(true);
    try {
      await toggleFollowArtist(artist.id);
      setIsFollowing(!isFollowing);
      addToast(isFollowing ? "已取消关注" : "已关注艺术家", <Check size={16} />);
    } catch {
      addToast("操作失败", <AlertCircle size={16} className="text-red-400" />);
    } finally {
      setFollowLoading(false);
    }
  };

  useEffect(() => {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) return;
    const handleScroll = () => {
      setScrollY(mainContent.scrollTop);
    };
    mainContent.addEventListener("scroll", handleScroll);
    return () => {
      mainContent.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!name) return;
    const getArtistDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient<ArtistDetails>(`/api/artists/name/${encodeURIComponent(name)}`);
        setArtist(data);
      } catch (err) {
        console.error("Failed to fetch artist details:", err);
        setError(err instanceof Error ? err.message : "Failed to load artist");
      } finally {
        setLoading(false);
      }
    };
    getArtistDetails();
  }, [name]);

  if (loading) {
    return <ArtistPageSkeleton />;
  }

  if (error || !artist) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-neutral-400">
        <AlertCircle size={48} className="mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-white mb-2">Artist Not Found</h2>
        <p className="mb-6">
          {error || "The requested artist does not exist."}
        </p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-white transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const ALBUM_TRACK_THRESHOLD = 5;
  const studioAlbums = artist.albums.filter(
    (album) => album.songs.length > ALBUM_TRACK_THRESHOLD
  );
  const singlesAndEPs = artist.albums.filter(
    (album) => album.songs.length <= ALBUM_TRACK_THRESHOLD
  );

  const popularSongs = artist.albums
    .flatMap((album) =>
      album.songs.map((song) => ({
        ...song,
        album: {
          id: album.id,
          title: album.title,
          artists: album.artists,
          coverPath: album.coverPath,
        },
      }))
    )
    .slice(0, 5);

  const handlePlayArtist = () => {
    if (popularSongs.length > 0) {
      playSong(popularSongs[0] as Song, popularSongs as Song[]);
    }
  };

  const getFullUrl = (path: string | null | undefined) => {
    if (!path) return null;
    const pathWithPublic = path.startsWith("/public") ? path : `/public${path}`;
    return getAuthenticatedSrc(pathWithPublic);
  };

  const avatarUrl = getFullUrl(artist.avatarUrl);
  const headerImageUrl = getFullUrl(artist.headerUrl) || avatarUrl || "/placeholder.jpg";

  const headerTextOpacity = Math.max(0, 1 - scrollY / 150);
  const headerTextTransform = `translateY(${Math.min(
    100,
    scrollY / 3
  )}px) scale(${Math.max(0.8, 1 - scrollY / 1000)})`;
  const imageScale = 1 + scrollY / 5000;
  const imageTransform = `scale(${imageScale})`;

  return (
    <div>
      <header className="relative w-full h-auto rounded-lg overflow-hidden group">
        <div className="relative w-full h-0 pb-[40%] max-h-[500px] min-h-[340px]">
          <Image
            src={headerImageUrl}
            alt={`Cover of ${artist.name}`}
            fill
            className={clsx(
              "object-cover transition-all duration-700",
              !artist.headerUrl && "blur-xl scale-110 opacity-60"
            )}
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 100vw"
            unoptimized={headerImageUrl.startsWith(API_BASE_URL)}
            style={{
              transform: imageTransform,
              objectPosition: artist.backgroundPosition || "50% 50%",
              willChange: "transform",
            }}
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

        <div
          className="absolute bottom-0 p-6 md:p-8 flex items-end gap-6 w-full"
          style={{
            opacity: headerTextOpacity,
            transform: headerTextTransform,
            willChange: "transform, opacity",
          }}
        >
          {avatarUrl && (
            <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-full overflow-hidden shadow-2xl border-4 border-neutral-900/50">
              <Image
                src={avatarUrl}
                alt={artist.name}
                fill
                className="object-cover"
                style={{ objectPosition: artist.avatarPosition || "50% 50%" }}
                unoptimized={avatarUrl.startsWith(API_BASE_URL)}
            />
            </div>
          )}

          <div className="flex flex-col gap-2 mb-2">
            <span className="font-bold text-sm md:text-base flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-white fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
              认证艺术家
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter shadow-black drop-shadow-lg">
              {artist.name}
            </h1>
          </div>
        </div>
      </header>

      <div className="p-8">
        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={handlePlayArtist}
            className="bg-green-500 text-black p-4 rounded-full shadow-lg hover:scale-105 transition-transform"
            aria-label={`Play ${artist.name}`}
          >
            <Play
              size={28}
              fill="black"
              className="translate-x-0.5 text-black"
            />
          </button>

          <button
            onClick={handleToggleFollow}
            disabled={followLoading}
            className={clsx(
              "px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 flex items-center gap-2",
              isFollowing
                ? "bg-neutral-800/80 text-green-400 border-2 border-green-500/60 hover:bg-neutral-700/80"
                : "bg-transparent text-white border-2 border-white/80 hover:bg-white hover:text-black hover:scale-105"
            )}
          >
            {isFollowing ? (
              <>
                已关注
              </>
            ) : (
              <>
                关注
              </>
            )}
          </button>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">流行</h2>
          <PopularSongsList songs={popularSongs} />
        </section>

        {artist.bio && artist.bioImageUrl && (
          <AboutCard
            bio={artist.bio}
            imageUrl={getFullUrl(artist.bioImageUrl)!}
          />
        )}

        {studioAlbums.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">专辑</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {studioAlbums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={{
                    ...album,
                    _count: { songs: album.songs.length },
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {singlesAndEPs.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">单曲与EP</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {singlesAndEPs.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={{
                    ...album,
                    _count: { songs: album.songs.length },
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ArtistDetailPage;
