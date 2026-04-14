"use client";

import { useCallback, useEffect, useState } from "react";

type UserRow = {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
  createdAt: string;
};

export function UsersAdminClient() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"admin" | "vendor">("vendor");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data.users ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim().toLowerCase(),
        password,
        displayName: displayName.trim() || undefined,
        role,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? "Failed");
      return;
    }
    setMsg("User created.");
    setUsername("");
    setPassword("");
    setDisplayName("");
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Delete failed");
      return;
    }
    void load();
  };

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="rounded-xl border border-track-border bg-track-surface/60 p-4">
        <h2 className="mb-4 font-mono text-sm font-semibold text-track-accent">New user</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-zinc-500">Username</label>
            <input
              className="mt-1 w-full rounded border border-track-border bg-black/30 px-3 py-2 font-mono text-sm text-white"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Password (8+)</label>
            <input
              type="password"
              className="mt-1 w-full rounded border border-track-border bg-black/30 px-3 py-2 text-sm text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Display name</label>
            <input
              className="mt-1 w-full rounded border border-track-border bg-black/30 px-3 py-2 text-sm text-white"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Role</label>
            <select
              className="mt-1 w-full rounded border border-track-border bg-zinc-900 px-3 py-2 text-sm text-white"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "vendor")}
            >
              <option value="vendor">Vendor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-track-accent px-4 py-2 text-sm font-semibold text-zinc-900 hover:brightness-105"
        >
          Create user
        </button>
        {msg && <p className="mt-2 text-sm text-zinc-400">{msg}</p>}
      </form>

      <div className="overflow-x-auto rounded-xl border border-track-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-track-border bg-zinc-900/80 text-xs uppercase text-zinc-500">
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Display</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-800">
                <td className="px-3 py-2 font-mono text-white">{u.username}</td>
                <td className="px-3 py-2 text-zinc-400">{u.displayName ?? "—"}</td>
                <td className="px-3 py-2 text-zinc-400">{u.role}</td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                  {typeof u.createdAt === "string" ? u.createdAt.slice(0, 10) : "—"}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:underline"
                    onClick={() => void remove(u.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
