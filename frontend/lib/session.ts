import { cookies } from "next/headers";

import { API_URL } from "./api";
import type { PublicUser } from "./types";

export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  try {
    const response = await fetch(`${API_URL}/me`, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { user: PublicUser };
    return payload.user;
  } catch {
    return null;
  }
}
