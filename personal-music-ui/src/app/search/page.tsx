"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { apiClient } from "@/lib/api-client";
import type { Album, Artist, Song, Playlist } from "@/types";
import TopResultCard from "@/components/TopResultCard";
import SongRowItem from "@/components/SongRowItem";
import AlbumCard from "@/components/AlbumCard";
import ArtistSearchResultItem from "@/components/ArtistSearchResultItem";
import Link from "next/link";
import { FadeInContainer, FadeInItem } from "@/components/FadeInStagger";

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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) return;

    const handleScroll = () => {
      setIsScrolled(mainContent.scrollTop > 10);
    };

    mainContent.addEventListener("scroll", handleScroll);
    return () => {
      mainContent.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const fetchResults = async () => {
      const q = query?.trim();
      if (!q) {
        setResults({ albums: [], songs: [], artists: [], playlists: [] });
        setLoading(false);
        setHasSearched(false);
        return;
      }

      setLoading(true);
      try {
        const data = await apiClient<SearchResults>(
          `/api/search?q=${encodeURIComponent(q)}`
        );
        if (isCurrent && data) {
          setResults(data);
          setHasSearched(true);
        }
      } catch (error) {
        if (isCurrent) {
          console.error("Search failed:", error);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(fetchResults, 150);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query]);

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-neutral-400 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-[#121212] rounded-full flex items-center justify-center mb-6">
          <SearchIcon size={40} />
        </div>
        <h2 className="text-neutral-900 dark:text-white text-2xl font-bold mb-2">浏览全部内容</h2>
        <p>找到你最喜欢的歌曲、歌手和专辑。</p>
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
        <h2 className="text-neutral-900 dark:text-white text-xl font-bold">
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
        "px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-200",
        filter === type
          ? "bg-white text-black shadow-md scale-105"
          : "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/5"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="p-6 pb-32 min-h-screen">
      <div
        className={clsx(
          "flex gap-2 mb-6 sticky top-16 z-30 py-2.5 -mx-6 px-6 transition-all duration-300",
          isScrolled
            ? "bg-black/40 backdrop-blur-xl border-b border-white/5 shadow-md"
            : "bg-transparent"
        )}
      >
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
                    .map((artist) => (
                      <ArtistSearchResultItem key={artist.id} artist={artist} />
                    ))}
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
