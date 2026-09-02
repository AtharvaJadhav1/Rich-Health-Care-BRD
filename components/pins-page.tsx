"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { PinControls } from "@/components/pin-controls";
import { api } from "@/lib/api";

export default function PinsPage({ title, hint }: { title: string; hint: string }) {
  return (
    <RequireAuth>
      <Inner title={title} hint={hint} />
    </RequireAuth>
  );
}

function Inner({ title, hint }: { title: string; hint: string }) {
  const [joiningAmount, setJoiningAmount] = useState(999);

  useEffect(() => {
    api<{ joiningAmount: number }>("/plan")
      .then((plan) => setJoiningAmount(plan.joiningAmount))
      .catch((err) => toast.error(err.message));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div>
        <h1 className="font-heading text-3xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </div>
      <PinControls joiningAmount={joiningAmount} />
    </div>
  );
}
