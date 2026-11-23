"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "./api";

export function useLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);

    try {
      await apiRequest<void>("/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
      setPending(false);
    }
  }

  return { logout, pending };
}
