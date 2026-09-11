import AlbumCard from "@/components/AlbumCard";
import QuickResumeCard from "@/components/QuickResumeCard";
import WelcomeHeader from "@/components/WelcomeHeader";
import FeaturedChartsSection from "@/components/FeaturedChartsSection";
import MobileCategoryPills from "@/components/MobileCategoryPills";
import MobileHeroCarousel from "@/components/MobileHeroCarousel";
import MobileExploreSection from "@/components/MobileExploreSection";
import { apiClient } from "@/lib/api-client";
import { FadeInContainer, FadeInItem } from "@/components/FadeInStagger";
import type { Song } from "@/types";

type Album = {
  id: number;
  title: string;
  coverPath?: string | null;
  artists: {
    id: number;
    name: string;
  }[];
  _count: {
    songs: number;
  };
};

type ChartAlbum = {
  id: number;
  title: string;
  coverPath?: string | null;
  artists?: {
    id: number;
    name: string;
  }[];
  songs?: Song[];
};

const HomePage = async () => {
  let albums: Album[] = [];
  let randomAlbums: Album[] = [];
  let hotChart: ChartAlbum | null = null;
  let soarChart: ChartAlbum | null = null;
  let billboardChart: ChartAlbum | null = null;
  let koreaChart: ChartAlbum | null = null;
  let error: string | null = null;

  try {
    const [
      albumsData,
      randomAlbumsData,
      hotChartData,
      soarChartData,
      billboardChartData,
      koreaChartData,
    ] = await Promise.all([
      apiClient<Album[]>("/api/albums", { cache: "no-store" }).catch(() => []),
      apiClient<Album[]>("/api/albums/random?take=6", { cache: "no-store" }).catch(() => []),
      apiClient<ChartAlbum>("/api/albums/3778678", { cache: "no-store" }).catch((err) => {
        console.error("Failed to fetch hot chart:", err);
        return null;
      }),
      apiClient<ChartAlbum>("/api/albums/19723756", { cache: "no-store" }).catch((err) => {
        console.error("Failed to fetch soar chart:", err);
        return null;
      }),
      apiClient<ChartAlbum>("/api/albums/60198", { cache: "no-store" }).catch((err) => {
        console.error("Failed to fetch billboard chart:", err);
        return null;
      }),
      apiClient<ChartAlbum>("/api/albums/745956260", { cache: "no-store" }).catch((err) => {
        console.error("Failed to fetch korea chart:", err);
        return null;
      }),
    ]);

    albums = albumsData || [];
    randomAlbums = randomAlbumsData || [];
    hotChart = hotChartData;
    soarChart = soarChartData;
    billboardChart = billboardChartData;
    koreaChart = koreaChartData;
  } catch (e) {
    console.error("Failed to fetch data for home page:", e);
    error = "无法连接到服务器或认证失败 (请检查 API Key)";
  }

  return (
    <div
      className="relative min-h-screen pt-2 sm:pt-4 pb-28 sm:pb-32"
    >

      <div className="relative z-10 px-1 sm:px-4 md:px-6">
        {/* 移动端横向分类胶囊栏 (对标截图：推荐、刷歌、视频...) */}
        <MobileCategoryPills />

        {/* 移动端首屏沉浸大卡片轮播 (对标截图：水蓝猜你喜欢、暖橙Daily 30...) */}
        <MobileHeroCarousel hotSongs={hotChart?.songs || soarChart?.songs || []} />

        <WelcomeHeader />

        {/* 桌面端保留 6 个快速恢复卡片，移动端由更轻量高级的 MobileHeroCarousel 承接 */}
        {randomAlbums.length > 0 && (
          <section className="hidden md:block mb-8 sm:mb-10">
            <FadeInContainer className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
              {randomAlbums.map((album, index) => (
                <FadeInItem key={album.id}>
                  <QuickResumeCard album={album} priority={index < 6} />
                </FadeInItem>
              ))}
            </FadeInContainer>
          </section>
        )}

        {/* 官方热歌榜 / 飙升榜 / 美国公告榜 / 韩国榜精选 */}
        <FeaturedChartsSection
          hotChart={hotChart}
          soarChart={soarChart}
          billboardChart={billboardChart}
          koreaChart={koreaChart}
        />

        {/* 移动端专属：精选专辑与热门歌手横向流，打破死板，注入音乐探索活力 */}
        <MobileExploreSection
          albums={albums.length > 0 ? albums : randomAlbums}
          hotSongs={hotChart?.songs || soarChart?.songs || []}
        />

        {/* 桌面端保留【所有专辑】，移动端移除 */}
        <section className="hidden md:block mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              所有专辑
            </h2>
            <span className="text-sm font-bold text-neutral-400 hover:underline cursor-pointer">
              显示全部
            </span>
          </div>

          {error ? (
            <div className="text-red-400 bg-red-900/20 p-4 rounded-md border border-red-900/50">
              <p className="font-bold mb-1">加载失败</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          ) : albums.length > 0 ? (
            <FadeInContainer className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {albums.map((album, index) => (
                <FadeInItem key={album.id}>
                  <AlbumCard album={album} priority={index < 12} />
                </FadeInItem>
              ))}
            </FadeInContainer>
          ) : (
            <div className="text-neutral-500 mt-4 text-center py-10">
              暂无专辑。请先在服务器端扫描你的音乐库。
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default HomePage;
