import { redirect } from "next/navigation";
import { getAuthFromCookies } from "@/lib/auth-api";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthFromCookies();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="app-shell mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-8 flex flex-wrap items-center gap-4 border-b border-track-border pb-4">
        <a href="/dashboard" className="text-sm text-zinc-400 hover:text-white">
          ← Dashboard
        </a>
        <span className="text-zinc-600">|</span>
        <a href="/admin" className="text-sm font-semibold text-track-accent">
          Overview
        </a>
        <a href="/admin/users" className="text-sm text-zinc-400 hover:text-white">
          Users
        </a>
      </nav>
      {children}
    </div>
  );
}
