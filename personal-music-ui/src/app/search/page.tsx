"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon, AlertCircle } from "lucide-react";
import Image from "next/image";
import { clsx } from "clsx";
import { apiClient, getAuthenticatedSrc } from "@/lib/api-client";
import type { Album, Artist, Song, Playlist } from "@/types";
import TopResultCard from "@/components/TopResultCard";
import SongRowItem from "@/components/SongRowItem";
import AlbumCard from "@/components/AlbumCard";
import Link from "next/link";
import { FadeInContainer, FadeInItem } from "@/components/FadeInStagger";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type SearchResults = {
  albums: Album[];
  songs: Song[];
  artists: Artist[];
  playlists: Playlist[];
};

type FilterType = "all" | "artists" | "songs" | "albums";

const SearchPage = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get("q");

  const [results, setResults] = useState<SearchResults>({
    albums: [],
    songs: [],
    artists: [],
    playlists: [],
  });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setResults({ albums: [], songs: [], artists: [], playlists: [] });
        return;
      }

      setLoading(true);
      try {
        const data = await apiClient<SearchResults>(
          `/api/search?q=${encodeURIComponent(query)}`
        );
        setResults(data);
        setHasSearched(true);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-neutral-400 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-[#121212] rounded-full flex items-center justify-center mb-6">
          <SearchIcon size={40} />
        </div>
        <h2 className="text-white text-2xl font-bold mb-2">Browse All</h2>
        <p>Find your favorite songs, artists, and albums.</p>
      </div>
    );
  }

  if (
    !loading &&
    hasSearched &&
    !results.artists.length &&
    !results.songs.length &&
    !results.albums.length
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-neutral-400">
        <AlertCircle size={48} className="mb-4" />
        <h2 className="text-white text-xl font-bold">
          No results found for &quot;{query}&quot;
        </h2>
        <p>Please check your spelling or use different keywords.</p>
      </div>
    );
  }

  const topResultArtist = results.artists[0];
  const topResultAlbum =
    !topResultArtist && results.albums[0] ? results.albums[0] : null;
  const hasTopResult = topResultArtist || topResultAlbum;

  const FilterButton = ({
    type,
    label,
  }: {
    type: FilterType;
    label: string;
  }) => (
    <button
      onClick={() => setFilter(type)}
      className={clsx(
        "px-4 py-1.5 rounded-full text-sm font-bold transition-colors",
        filter === type
          ? "bg-white text-black"
          : "bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="p-6 pb-32 min-h-screen">
      <div className="flex gap-2 mb-6 sticky top-16 z-30 bg-[#121212]/95 backdrop-blur-md py-2 -mx-6 px-6">
        <FilterButton type="all" label="All" />
        <FilterButton type="artists" label="Artists" />
        <FilterButton type="songs" label="Songs" />
        <FilterButton type="albums" label="Albums" />
      </div>

      <FadeInContainer className="space-y-10">
        {filter === "all" && (hasTopResult || results.songs.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {hasTopResult && (
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Top result
                </h2>
                <div className="h-64">
                  <TopResultCard
                    result={topResultArtist || topResultAlbum}
                    type={topResultArtist ? "artist" : "album"}
                  />
                </div>
              </div>
            )}

            {results.songs.length > 0 && (
              <div className={hasTopResult ? "lg:col-span-3" : "lg:col-span-5"}>
                <h2 className="text-2xl font-bold text-white mb-4">Songs</h2>
                <div className="flex flex-col">
                  {results.songs.slice(0, 4).map((song, i) => (
                    <SongRowItem
                      key={song.id}
                      song={song}
                      index={i}
                      queue={results.songs.slice(0, 4)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(filter === "all" || filter === "artists") &&
          results.artists.length > 0 && (
            <FadeInItem>
              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Artists</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {results.artists
                    .slice(0, filter === "artists" ? undefined : 6)
                    .map((artist) => {
                      const getImageUrl = (path: string | null | undefined) => {
                        if (!path) return "/placeholder.jpg";
                        const pathWithPublic = path.startsWith("/public") ? path : `/public${path}`;
                        return getAuthenticatedSrc(pathWithPublic);
                      };

                      const imageUrl = getImageUrl(artist.avatarUrl);

                      return (
                        <Link
                          href={`/artist/${encodeURIComponent(artist.name)}`}
                          key={artist.id}
                          className="group p-4 bg-[#181818] hover:bg-[#282828] rounded-md transition-colors flex flex-col items-center text-center gap-4"
                        >
                          <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                            <Image
                              src={imageUrl}
                              alt={artist.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div>
                            <p className="font-bold text-white truncate w-full">
                              {artist.name}
                            </p>
                            <p className="text-sm text-neutral-400">Artist</p>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </section>
            </FadeInItem>
          )}

        {(filter === "all" || filter === "albums") &&
          results.albums.length > 0 && (
            <FadeInItem>
              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Albums</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {results.albums
                    .slice(0, filter === "albums" ? undefined : 6)
                    .map((album) => (
                      <AlbumCard key={album.id} album={album} />
                    ))}
                </div>
              </section>
            </FadeInItem>
          )}

        {filter === "songs" && results.songs.length > 0 && (
          <FadeInItem>
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Songs</h2>
              <div className="flex flex-col">
                {results.songs.map((song, i) => (
                  <SongRowItem
                    key={song.id}
                    song={song}
                    index={i}
                    queue={results.songs}
                  />
                ))}
              </div>
            </section>
          </FadeInItem>
        )}
      </FadeInContainer>
    </div>
  );
};

export default SearchPage;
