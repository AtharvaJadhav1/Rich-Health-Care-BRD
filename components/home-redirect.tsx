"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

/** Send signed-in users to their app home instead of the marketing homepage. */
export function HomeRedirect() {
  const { member, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !member) return;
    if (member.role === "ADMIN") router.replace("/admin");
    else if (member.role === "SUPPORT") router.replace("/admin/members");
    else router.replace("/dashboard");
  }, [member, loading, router]);

  return null;
}

export function homeHref(member: { role: string } | null) {
  if (!member) return "/";
  if (member.role === "ADMIN") return "/admin";
  if (member.role === "SUPPORT") return "/admin/members";
  return "/dashboard";
}
