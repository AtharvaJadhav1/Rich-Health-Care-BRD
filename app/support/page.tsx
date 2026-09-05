"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { PageHero, PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function SupportPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [contactPhone, setContactPhone] = useState("9307116704");

  useEffect(() => {
    api<{ contactPhone?: string }>("/public/status")
      .then((status) => {
        if (status.contactPhone?.trim()) setContactPhone(status.contactPhone.trim());
      })
      .catch(() => {});
  }, []);

  return (
    <PageShell width="6xl" className="space-y-6">
      <PageHero
        title="Support"
        description="Reach Rich Health Care Ayurveda for PIN, KYC, payouts, or technical help."
      />
      <Card>
        <CardHeader>
          <CardTitle>Contact desk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Rich Health Care Ayurveda</p>
          <p>Office No. 2, 1st Floor, Patil Complex, near Maharashtra Bank, Padgha, Bhiwandi, 421101</p>
          <p>
            Mobile:{" "}
            <a className="font-medium text-primary hover:underline" href={`tel:${contactPhone}`}>
              {contactPhone}
            </a>
          </p>
          <Link href="/contact" className={buttonVariants({ variant: "outline" })}>
            Send a message
          </Link>
        </CardContent>
      </Card>
    </PageShell>
  );
}
