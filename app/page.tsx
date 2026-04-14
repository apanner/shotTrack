import { redirect } from "next/navigation";
import { cookies } from "next/headers";

const COOKIE = "shottrack_auth";

export default function HomePage() {
  const token = cookies().get(COOKIE)?.value;
  if (token) {
    redirect("/dashboard");
  }
  redirect("/login");
}
