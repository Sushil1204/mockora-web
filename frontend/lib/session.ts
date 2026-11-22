import { cookies } from "next/headers";

import { API_URL } from "./api";
import type { PublicUser } from "./types";

export async function fetchServerApi<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const payload = await fetchServerApi<{ user: PublicUser }>("/me");
  return payload?.user ?? null;
}
