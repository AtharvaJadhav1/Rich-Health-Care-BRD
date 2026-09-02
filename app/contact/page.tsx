"use client";

import { FormEvent, useEffect, useState } from "react";
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
  const phone = status?.contactPhone?.trim();

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Contact</p>
        <h1 className="font-heading mt-2 text-4xl font-semibold">Talk to the desk</h1>
        <p className="mt-4 text-muted-foreground">
          For joining, payment confirmation, or product supply, write to {status?.companyName ?? "Rich Health Care"}.
          Payments are confirmed by UTR: include your Member ID and bank reference if you are following up on a
          transfer.
        </p>
        <div className="mt-8 space-y-2 text-sm">
          {email ? <p>Email: {email}</p> : null}
          {phone ? <p>Phone: {phone}</p> : null}
          {!email && !phone ? (
            <p className="text-muted-foreground">
              Public desk details are set by the administrator under Plan config.
            </p>
          ) : null}
          <p>Hours: Monday–Saturday, 10:00–18:00 IST</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Send a message</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p>
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
              <Button type="submit">Send</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
