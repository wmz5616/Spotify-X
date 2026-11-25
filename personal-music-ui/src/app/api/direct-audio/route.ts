import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isLikelyFullTrack(
  data: { url?: string; size?: number; br?: number },
  expectedDuration?: number
): boolean {
  if (!data?.url || typeof data.url !== "string" || !data.url.startsWith("http")) {
    return false;
  }

  const size = typeof data.size === "number" ? data.size : Number(data.size);
  const br = typeof data.br === "number" ? data.br : Number(data.br);

  if (Number.isFinite(size) && size > 0) {
    if ((!expectedDuration || expectedDuration > 60) && size <= 1_000_000) {
      return false;
    }
    if (Number.isFinite(br) && br > 0) {
      const estimatedSeconds = (size * 8) / (br * 1000);
      if (expectedDuration && expectedDuration > 75) {
        if (estimatedSeconds < Math.min(50, expectedDuration * 0.45)) return false;
      } else if (expectedDuration && expectedDuration > 0) {
        if (estimatedSeconds < expectedDuration * 0.45) return false;
      } else if (estimatedSeconds < 45) {
        return false;
      }
    }
  }

  return true;
}

/**
 * 同源音频直链解析代理：
 * 由 Next.js 服务端代为向 music-api.gdstudio.xyz 解析网易云完整音轨直链 (*.music.126.net)，
 * 避免中国大陆用户浏览器在无 VPN 环境下直连海外解析域超时或被阻断。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  const brParam = searchParams.get("br") || "320";
  const durationParam = searchParams.get("duration");

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ url: null, error: "invalid_id" }, { status: 400 });
  }

  const expectedDuration = durationParam ? Number(durationParam) : undefined;
  const bitrates = brParam === "999" ? [999, 320] : brParam === "192" ? [192, 320] : [320, 999];

  let blocked = false;

  for (const br of bitrates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7500);
    try {
      const res = await fetch(
        `https://music-api.gdstudio.xyz/api.php?types=url&id=${id}&source=netease&br=${br}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
          },
          signal: controller.signal,
          cache: "no-store",
        }
      );
      clearTimeout(timeout);

      if (res.status === 403 || res.status === 429 || res.status === 503) {
        blocked = true;
        break;
      }

      if (!res.ok) continue;

      const text = await res.text();
      if (!text.trim().startsWith("{")) {
        blocked = true;
        continue;
      }

      const data = JSON.parse(text);
      if (isLikelyFullTrack(data, expectedDuration)) {
        return NextResponse.json(
          {
            url: data.url,
            br: Number(data.br) || br,
            size: Number(data.size) || 0,
          },
          {
            headers: {
              "Cache-Control": "public, max-age=300",
            },
          }
        );
      }

      if (!data?.url) {
        return NextResponse.json({ url: null, notFound: true });
      }
    } catch {
      clearTimeout(timeout);
      blocked = true;
    }
  }

  return NextResponse.json({ url: null, blocked });
}
