"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHero, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

type PublicStatus = {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
};

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState<PublicStatus | null>(null);

  useEffect(() => {
    api<PublicStatus>("/public/status")
      .then(setStatus)
      .catch(() => {});
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  const email = status?.contactEmail?.trim();
  const phone = status?.contactPhone?.trim() || "9307116704";

  return (
    <PageShell width="6xl">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <PageHero
            eyebrow="Contact"
            title="Talk to the desk"
            description="For joining, payment confirmation, or product supply, write to Rich Health Care Ayurveda. Include your Member ID and bank reference when following up on a transfer."
          />
          <div className="glass-panel space-y-3 p-6 text-sm">
            <p className="font-medium text-foreground">{status?.companyName ?? "Rich Health Care Ayurveda"}</p>
            <p className="leading-relaxed text-muted-foreground">
              Office No. 2, 1st Floor, Patil Complex, near Maharashtra Bank, Padgha, Bhiwandi, 421101
            </p>
            {email ? <p className="text-muted-foreground">Email: {email}</p> : null}
            {phone ? (
              <p>
                Call / WhatsApp:{" "}
                <a className="font-medium text-primary hover:underline" href={`tel:${phone}`}>
                  {phone}
                </a>
              </p>
            ) : null}
            <p className="text-muted-foreground">Hours: Monday–Saturday, 10:00–18:00 IST</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send a message</CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <p className="leading-relaxed text-muted-foreground">
                Thank you. Please also reach the desk
                {phone ? ` on ${phone}` : " using the phone number published by the company"}
                {email ? ` or ${email}` : ""}.
              </p>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" required rows={5} />
                </div>
                <Button type="submit" className="w-full sm:w-auto">
                  Send
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
