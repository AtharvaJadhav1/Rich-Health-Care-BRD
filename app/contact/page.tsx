"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Contact</p>
        <h1 className="font-heading mt-2 text-4xl font-semibold">Talk to the desk</h1>
        <p className="mt-4 text-muted-foreground">
          For joining, payment confirmation, or product supply, write to the support desk. Payments stay
          manual in this phase — include your member code and UTR if you are following up on a transfer.
        </p>
        <div className="mt-8 space-y-2 text-sm">
          <p>Email: desk@richhealthcare.example</p>
          <p>Phone: +91 90000 00001</p>
          <p>Hours: Monday–Saturday, 10:00–18:00 IST</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Send a message</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p>Thanks. The desk will reply on the phone number you left.</p>
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
