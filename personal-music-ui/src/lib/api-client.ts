const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

if (typeof window !== "undefined" && !API_KEY) {
  console.error(
    "配置错误: 缺少 NEXT_PUBLIC_API_KEY 环境变量。API 请求将会失败。"
  );
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number>;
  body?: any;
}

/**
 * @param path
 */
export function getAuthenticatedSrc(path?: string | null): string {
  if (!path || path === "null" || path === "undefined") return "";
  let cleanPath = path.trim();

  // 递归或正则清除意外拼装的 /public、public 前缀（例如 /publichttps://... 或 public/http://...）
  cleanPath = cleanPath.replace(/^(\/?public\/?)+(https?:\/\/)/i, "$2");

  // 如果是在线外部图片直链，直接返回，不拼接本地后端路径
  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    return cleanPath;
  }
  if (!API_KEY) {
    console.warn("getAuthenticatedSrc: 缺少 API Key");
    return "";
  }

  let normalizedPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  
  // 核心逻辑: 如果是媒体文件夹路径且缺少 /public/ 或 /static/ 等前缀，统一补全 /public
  // 这样可以解决后端存数据库路径不带 public，但 ServeStatic 挂载在 /public 的不一致问题
  const mediaFolders = ['/avatars/', '/backgrounds/', '/covers/', '/feed/', '/artist-images/', '/playlist-covers/', '/chat/'];
  const hasCommonPrefix = normalizedPath.startsWith('/public/') || 
                         normalizedPath.startsWith('/static/') || 
                         normalizedPath.startsWith('/api/');
                         
  if (!hasCommonPrefix && mediaFolders.some(folder => normalizedPath.startsWith(folder))) {
    normalizedPath = `/public${normalizedPath}`;
  }

  const separator = normalizedPath.includes("?") ? "&" : "?";
  return `${API_BASE_URL}${normalizedPath}${separator}key=${API_KEY}`;
}

/**
 * Get the streaming source URL with an optional token
 * @param songId 
 * @param token 
 * @param quality 
 */
export function getStreamSrc(songId: number, token?: string, quality?: string): string {
  let url = `${API_BASE_URL}/api/stream/${songId}`;
  const params = new URLSearchParams();
  
  if (token) {
    params.append('token', token);
  } else if (API_KEY) {
    // Fallback to key if no token provided
    params.append('key', API_KEY);
  }
  
  if (quality) {
    params.append('quality', quality);
  }
  
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Get token from zustand storage
  let token = "";
  if (typeof window !== "undefined") {
    const storage = localStorage.getItem("user-storage");
    if (storage) {
      try {
        const parsed = JSON.parse(storage);
        token = parsed.state?.token || "";
      } catch (e) {
        console.error("Failed to parse user-storage", e);
      }
    }
  }

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      "x-api-key": API_KEY || "",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (options.body && typeof options.body === "object" && !(options.body instanceof Blob) && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  } else if (options.body) {
    config.body = options.body;
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      if (response.status === 401) {
        console.error("API 认证失败：请检查 API Key 配置");
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    try {
      return text ? JSON.parse(text) : (null as any as T);
    } catch (e) {
      return null as any as T;
    }
  } catch (error) {
    console.error(`Request failed: ${url}`, error);
    throw error;
  }
}
