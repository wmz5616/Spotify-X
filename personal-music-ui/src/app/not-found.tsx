import Link from "next/link";
import { Music2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 select-none">
      <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4 text-neutral-400">
        <Music2 size={32} />
      </div>
      <h1 className="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-2">
        404 - 页面未找到
      </h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mb-6">
        你访问的页面可能已被移动、删除或暂时无法访问。
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] text-black font-bold text-sm shadow-md transition-all active:scale-95"
      >
        返回首页
      </Link>
    </div>
  );
}
