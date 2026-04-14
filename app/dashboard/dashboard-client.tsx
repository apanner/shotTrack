"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "admin" | "vendor";

type ShotRow = {
  id: string;
  projectId: string;
  sequence: string;
  code: string;
  description: string;
  stage: string;
  status: string;
  priority: string;
  dueOn: string | null;
  bidDays?: number | null;
  assignedUserId: string | null;
  assigneeUsername: string | null;
  assigneeDisplay: string | null;
};

type Me = { id: string; username: string; displayName: string | null; role: Role };

const STAGES = [
  { value: "temp", label: "Temp" },
  { value: "wip", label: "WIP" },
  { value: "tech_check", label: "Tech check" },
  { value: "final", label: "Final" },
] as const;

export function DashboardClient() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [shots, setShots] = useState<ShotRow[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (!res.ok) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setMe(data.user);
  }, [router]);

  const loadShots = useCallback(async () => {
    if (!projectId) {
      setShots([]);
      return;
    }
    const res = await fetch(`/api/shots?projectId=${encodeURIComponent(projectId)}`);
    if (!res.ok) return;
    const data = await res.json();
    setShots(data.shots ?? []);
  }, [projectId]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        const list = data.projects ?? [];
        setProjects(list);
        setProjectId((prev) => prev || list[0]?.id || "");
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    void loadShots();
  }, [loadShots]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const updateStage = async (shotId: string, stage: string) => {
    const res = await fetch(`/api/shots/${shotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Update failed");
      return;
    }
    void loadShots();
  };

  const runImport = async () => {
    setImportMsg(null);
    if (!projectId || !pasteText.trim()) {
      setImportMsg("Select a project and paste Excel rows (TSV).");
      return;
    }
    const res = await fetch("/api/import/paste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, text: pasteText }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setImportMsg(data.error ?? "Import failed");
      return;
    }
    setImportMsg(`Inserted ${data.inserted}, skipped ${data.skipped}.`);
    setPasteText("");
    void loadShots();
  };

  const createProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Could not create project");
      return;
    }
    setNewProjectName("");
    const res2 = await fetch("/api/projects");
    if (res2.ok) {
      const data2 = await res2.json();
      const list = data2.projects ?? [];
      setProjects(list);
      if (data.project?.id) setProjectId(data.project.id);
    }
  };

  if (loading || !me) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
        Loading…
      </div>
    );
  }

  const isAdmin = me.role === "admin";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-track-border pb-4">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-white">Shot list</h1>
          <p className="text-sm text-zinc-400">
            {me.displayName ?? me.username} · {isAdmin ? "Admin (all shots)" : "Vendor (assigned only)"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <a
              href="/admin"
              className="rounded-lg border border-track-border bg-zinc-800/80 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
            >
              Admin
            </a>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Project
          </label>
          <select
            className="rounded-lg border border-track-border bg-track-surface px-3 py-2 font-mono text-sm text-white"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-end gap-2">
            <input
              className="rounded-lg border border-track-border bg-black/30 px-3 py-2 text-sm text-white"
              placeholder="New project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void createProject()}
              className="rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600"
            >
              Create project
            </button>
          </div>
        )}
      </div>

      {isAdmin && (
        <section className="rounded-xl border border-track-border bg-track-surface/60 p-4">
          <h2 className="mb-2 font-mono text-sm font-semibold text-track-accent">Import from Excel (paste)</h2>
          <p className="mb-2 text-xs text-zinc-500">
            Copy rows from Excel. First row: headers. Required: <code className="text-amber-200/90">code</code> or{" "}
            <code className="text-amber-200/90">shot</code>. Optional: sequence, description, stage, status, priority,
            due, bid, assignee (username).
          </p>
          <textarea
            className="mb-2 w-full min-h-[120px] rounded-lg border border-track-border bg-black/40 p-3 font-mono text-xs text-zinc-200"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"sequence\tcode\tdescription\tstage\tbid\tassignee\nBES\tBES_010\tHero comp\ttemp\t2.5\tvendor1"}
          />
          <button
            type="button"
            onClick={() => void runImport()}
            className="rounded-lg bg-track-accent/90 px-4 py-2 text-sm font-semibold text-zinc-900 hover:brightness-105"
          >
            Import rows
          </button>
          {importMsg && <p className="mt-2 text-sm text-zinc-400">{importMsg}</p>}
        </section>
      )}

      <div className="overflow-x-auto rounded-xl border border-track-border shadow-xl">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-track-border bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
              <th className="sticky left-0 z-10 bg-zinc-900 px-3 py-3 font-mono">Seq</th>
              <th className="sticky left-12 z-10 bg-zinc-900 px-3 py-3 font-mono">Shot</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3">Stage</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Due</th>
              <th className="px-3 py-3">Assignee</th>
              {isAdmin && <th className="px-3 py-3">Bid (days)</th>}
            </tr>
          </thead>
          <tbody>
            {shots.map((s) => (
              <tr key={s.id} className="border-b border-zinc-800/80 hover:bg-white/[0.03]">
                <td className="sticky left-0 z-[1] bg-track-bg/95 px-3 py-2 font-mono text-zinc-400">{s.sequence}</td>
                <td className="sticky left-12 z-[1] bg-track-bg/95 px-3 py-2 font-mono font-semibold text-white">{s.code}</td>
                <td className="max-w-[240px] truncate px-3 py-2 text-zinc-400" title={s.description}>
                  {s.description}
                </td>
                <td className="px-3 py-2">
                  <select
                    className="rounded border border-track-border bg-zinc-900 px-2 py-1 text-xs text-white"
                    value={s.stage}
                    onChange={(e) => void updateStage(s.id, e.target.value)}
                  >
                    {STAGES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-xs text-zinc-400">{s.status.replace(/_/g, " ")}</td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-400">{s.dueOn ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-zinc-400">{s.assigneeUsername ?? "—"}</td>
                {isAdmin && (
                  <td className="px-3 py-2 font-mono text-xs text-track-accent">
                    {s.bidDays != null ? String(s.bidDays) : "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {shots.length === 0 && (
          <p className="p-6 text-center text-sm text-zinc-500">No shots in this project (or none assigned to you).</p>
        )}
      </div>
    </div>
  );
}
