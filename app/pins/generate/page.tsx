"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { RequireAuth } from "@/components/require-auth";

export default function PinGeneratePage() {
  return (
    <RequireAuth>
      <Redirect />
    </RequireAuth>
  );
}

function Redirect() {
  const { member, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (member?.role === "ADMIN") router.replace("/admin/pins");
    else router.replace("/dashboard");
  }, [member, loading, router]);

  return <p className="px-4 py-16 text-center text-muted-foreground">Redirecting…</p>;
}
