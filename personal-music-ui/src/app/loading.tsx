import React from "react";

export default function Loading() {
  return (
    <div className="relative min-h-screen bg-[#121212] pt-4 pb-32 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-neutral-800/20 to-transparent pointer-events-none" />
      <div className="relative z-10 px-6">
        <div className="mb-8 mt-2 space-y-2">
          <div className="h-10 w-64 bg-neutral-800/50 rounded animate-pulse" />
          <div className="h-6 w-48 bg-neutral-800/50 rounded animate-pulse" />
        </div>

        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 md:h-20 bg-neutral-800/40 rounded-md animate-pulse flex items-center overflow-hidden"
              >
                <div className="h-full aspect-square bg-neutral-700/50" />
                <div className="ml-4 h-4 w-32 bg-neutral-700/50 rounded" />
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-32 bg-neutral-800/50 rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-md bg-[#181818] animate-pulse"
              >
                <div className="w-full aspect-square bg-neutral-800 rounded-md mb-4 shadow-lg" />
                <div className="h-4 w-3/4 bg-neutral-800 rounded mb-2" />
                <div className="h-3 w-1/2 bg-neutral-800/60 rounded" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
