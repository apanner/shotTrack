import type { SessionPayload } from "./jwt";

/** Strip bids for non-admin users (vendor / outsource). */
export function mapShotForRole<T extends { bidDays: number | null }>(
  shot: T,
  session: SessionPayload
): T | Omit<T, "bidDays"> {
  if (session.role === "admin") return shot;
  const { bidDays: _b, ...rest } = shot;
  return rest as Omit<T, "bidDays">;
}

export function mapShotsForRole<T extends { bidDays: number | null }>(shots: T[], session: SessionPayload) {
  return shots.map((s) => mapShotForRole(s, session));
}
