"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { isStaffRole } from "@/lib/member-status";

export function RequireAuth({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: "ADMIN" | "STAFF" | "MEMBER";
}) {
  const { member, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!member) {
      router.replace("/login");
      return;
    }
    if (role === "ADMIN" && member.role !== "ADMIN") {
      router.replace(isStaffRole(member.role) ? "/admin/members" : "/dashboard");
      return;
    }
    if (role === "STAFF" && !isStaffRole(member.role)) {
      router.replace("/dashboard");
    }
  }, [loading, member, role, router]);

  if (loading || !member) {
    return <p className="px-4 py-16 text-center text-muted-foreground">Loading your account…</p>;
  }
  if (role === "ADMIN" && member.role !== "ADMIN") return null;
  if (role === "STAFF" && !isStaffRole(member.role)) return null;
  return <>{children}</>;
}
