/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    const rawBackend =
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3001";
    const backendOrigin = rawBackend.replace(/\/+$/, "");

    return {
      // afterFiles 在本地 Next.js Route Handlers（如 /api/direct-audio）与 public/ 静态资源之后执行，
      // 将其余所有 /api/*、/public/*、/static/*、/socket.io/* 同源反向代理到后端源站，
      // 彻底避免中国大陆浏览器直连 *.onrender.com 需挂 VPN 的问题。
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${backendOrigin}/api/:path*`,
        },
        {
          source: "/public/:path*",
          destination: `${backendOrigin}/public/:path*`,
        },
        {
          source: "/static/:path*",
          destination: `${backendOrigin}/static/:path*`,
        },
        {
          source: "/socket.io/:path*",
          destination: `${backendOrigin}/socket.io/:path*`,
        },
      ],
    };
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/static/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/artist-images/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/api/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/avatars/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/backgrounds/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/playlist-covers/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/chat/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.kuwo.cn",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "**.kuwo.cn",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "resources.tidal.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.music.126.net",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "**.music.126.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.126.net",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "**.126.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.qq.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.gtimg.cn",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "**.gtimg.cn",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
