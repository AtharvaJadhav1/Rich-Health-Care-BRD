"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { PageHero, PageShell } from "@/components/page-shell";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/components/auth-provider";
import { api, uploadPhoto } from "@/lib/api";
import { formatDate } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Me = {
  member: {
    name: string;
    phone: string;
    memberCode: string;
    panNumber?: string;
    kycStatus: string;
    rank: string | null;
    photoUrl: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    createdAt: string;
    activatedAt: string | null;
  };
  sponsor: { name: string; memberCode: string } | null;
};

function formatAddress(member: Me["member"]) {
  return [member.address, member.city, member.state].filter(Boolean).join(", ");
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { member, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [uploading, setUploading] = useState(false);

  async function load() {
    const profile = await api<Me>("/member/me");
    setMe(profile);
    setAddress(profile.member.address ?? "");
    setCity(profile.member.city ?? "");
    setState(profile.member.state ?? "");
    await refresh();
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onPhotoSelected(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      await uploadPhoto(file);
      toast.success("Profile photo updated");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/member/me", { method: "PATCH", body: { address, city, state } });
      toast.success("Profile updated");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update profile");
    }
  }

  if (!me) {
    return <p className="px-4 py-16 text-center text-muted-foreground">Loading profile…</p>;
  }

  const m = me.member;
  const fullAddress = formatAddress(m);

  return (
    <PageShell width="6xl" className="space-y-6">
      <PageHero title="My Profile" description="Your distributor identity, welcome letter, and account details." />

      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-3 sm:shrink-0">
            <div className="relative flex size-36 items-center justify-center overflow-hidden rounded-2xl border-2 border-primary/20 bg-muted shadow-sm">
              {m.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.photoUrl} alt={m.name} className="size-full object-cover" />
              ) : (
                <span className="text-4xl font-semibold text-muted-foreground">{m.name.slice(0, 1)}</span>
              )}
              <button
                type="button"
                className="absolute inset-0 flex items-end justify-center bg-black/0 pb-2 transition-colors hover:bg-black/25"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label="Upload profile photo"
              >
                <span className="flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow">
                  <Camera className="size-3.5" />
                  {uploading ? "Uploading…" : "Change"}
                </span>
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => onPhotoSelected(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? "Uploading…" : "Upload photo"}
            </Button>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-2xl font-semibold">{m.name}</h2>
                <p className="font-mono text-sm text-muted-foreground">{m.memberCode}</p>
              </div>
              <Badge variant={m.kycStatus === "VERIFIED" ? "default" : "secondary"}>{m.kycStatus}</Badge>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Detail label="Contact number" value={m.phone} />
              <Detail label="Joining date" value={formatDate(m.createdAt)} />
              <Detail label="Rank" value={m.rank ?? "Distributor"} />
              <Detail label="PAN" value={m.panNumber ?? "—"} />
              <Detail
                className="sm:col-span-2"
                label="Address"
                value={fullAddress || "Not added yet — update under Details tab"}
              />
              <Detail
                label="Sponsor"
                value={me.sponsor ? `${me.sponsor.name} (${me.sponsor.memberCode})` : "—"}
              />
              {m.activatedAt ? <Detail label="Active since" value={formatDate(m.activatedAt)} /> : null}
            </dl>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="welcome">
        <TabsList>
          <TabsTrigger value="welcome">Welcome Letter</TabsTrigger>
          <TabsTrigger value="card">ID Card</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="welcome" className="pt-4">
          <Card className="mx-auto max-w-2xl print:shadow-none" id="welcome-letter">
            <CardHeader className="border-b bg-primary/5 text-center">
              <CardTitle>Welcome to Rich Health Care Ayurveda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 text-sm leading-relaxed">
              <p>Dear {m.name},</p>
              <p>
                Welcome to Rich Health Care Ayurveda. Your distributor account has been created successfully. We are
                delighted to have you join our Ayurvedic wellness network built on trust, herbal products, and binary
                growth.
              </p>
              <p>
                <span className="font-medium">Member ID:</span> {m.memberCode}
                <br />
                <span className="font-medium">Joined:</span> {formatDate(m.createdAt)}
                <br />
                <span className="font-medium">Sponsor:</span>{" "}
                {me.sponsor ? `${me.sponsor.name} (${me.sponsor.memberCode})` : "—"}
              </p>
              <p>
                Submit your PIN for admin approval to turn Green, build your left and right team from the Genealogy tree,
                and grow your income through matching and retail.
              </p>
              <p className="font-medium">Rich Health Care Ayurveda · Padgha, Bhiwandi</p>
            </CardContent>
          </Card>
          <Button className="mt-4 print:hidden" variant="outline" onClick={() => window.print()}>
            Print welcome letter
          </Button>
        </TabsContent>
        <TabsContent value="card" className="pt-4">
          <Card className="mx-auto max-w-lg print:shadow-none" id="id-card">
            <CardHeader className="border-b bg-primary/5">
              <CardTitle className="text-center">Rich Health Care · Distributor ID</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-5 pt-6">
              <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-3xl font-semibold">{m.name.slice(0, 1)}</span>
                )}
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="text-lg font-semibold">{m.name}</p>
                <p className="font-mono">{m.memberCode}</p>
                <p>Contact: {m.phone}</p>
                <p>Joined: {formatDate(m.createdAt)}</p>
                <p className="leading-relaxed">{fullAddress || "—"}</p>
                <Badge variant={m.kycStatus === "VERIFIED" ? "default" : "secondary"}>{m.kycStatus}</Badge>
              </div>
            </CardContent>
          </Card>
          <Button className="mt-4 print:hidden" variant="outline" onClick={() => window.print()}>
            Print ID card
          </Button>
        </TabsContent>
        <TabsContent value="details" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Update address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid max-w-xl gap-3" onSubmit={save}>
                <div className="space-y-2">
                  <Label>Locality / village (At)</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={state} onChange={(e) => setState(e.target.value)} required />
                </div>
                <Button type="submit">Save address</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function Detail({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
