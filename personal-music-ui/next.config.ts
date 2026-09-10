/** @type {import('next').NextConfig} */
const nextConfig = {
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
        protocol: "http",
        hostname: "**.qq.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
