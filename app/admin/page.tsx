export default function AdminHomePage() {
  return (
    <div>
      <h1 className="font-mono text-2xl font-bold text-white">Admin</h1>
      <p className="mt-2 text-zinc-400">
        Manage users and projects from the dashboard. Vendors only see shots assigned to them; bid columns are hidden from
        vendors.
      </p>
      <ul className="mt-6 list-inside list-disc space-y-2 text-sm text-zinc-300">
        <li>Create vendor users and assign shots via import or future shot editor.</li>
        <li>Use Excel paste on the dashboard with an <code className="text-track-accent">assignee</code> column (username).</li>
        <li>For Vercel: use Turso (libSQL) — see README in this folder.</li>
      </ul>
    </div>
  );
}
