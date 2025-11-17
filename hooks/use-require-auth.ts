"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function useRequireAuth(redirectTo: string = "/login") {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.replace(redirectTo);
    }
  }, [session.status, redirectTo, router]);

  return session;
}
