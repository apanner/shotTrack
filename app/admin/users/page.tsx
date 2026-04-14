import { UsersAdminClient } from "./users-client";

export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="font-mono text-2xl font-bold text-white">Users</h1>
      <p className="mt-1 text-sm text-zinc-500">Create vendor accounts for outsource partners. Minimum password length: 8.</p>
      <div className="mt-6">
        <UsersAdminClient />
      </div>
    </div>
  );
}
