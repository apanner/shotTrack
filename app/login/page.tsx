import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

const COOKIE = "shottrack_auth";

export default function LoginPage() {
  if (cookies().get(COOKIE)?.value) {
    redirect("/dashboard");
  }
  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-track-border bg-track-surface/90 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-lg bg-gradient-to-br from-track-accent to-amber-900 shadow-lg shadow-amber-900/30" />
          <h1 className="font-mono text-xl font-bold tracking-tight text-white">ShotTrack</h1>
          <p className="mt-1 text-sm text-zinc-400">Sign in to view your assigned shots</p>
        </div>
        <LoginForm />
      </div>
      <p className="mt-8 max-w-md text-center text-xs text-zinc-500">
        Production tracking for outsource vendors. Admins see all shots and bids; vendors see assigned shots only.
      </p>
    </div>
  );
}
