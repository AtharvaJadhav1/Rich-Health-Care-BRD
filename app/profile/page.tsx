"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/components/auth-provider";
import { PairingDiagram, TreeNode } from "@/components/pairing-diagram";
import { api } from "@/lib/api";
import { formatDate, inr } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Wallet = {
  balance: number;
  ledger: {
    id: string;
    type: string;
    amount: number;
    note: string | null;
    createdAt: string;
  }[];
};

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
    createdAt: string;
  };
  sponsor: { name: string; memberCode: string } | null;
};

export default function ProfilePage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { refresh } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [tree, setTree] = useState<{
    tree: TreeNode;
    volume: {
      leftCount: number;
      rightCount: number;
      carryLeft: number;
      carryRight: number;
      pairsMatched: number;
      payout: number;
    };
  } | null>(null);
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  async function load() {
    const [profile, w, t] = await Promise.all([
      api<Me>("/member/me"),
      api<Wallet>("/member/wallet"),
      api<{ tree: TreeNode; volume: never }>("/member/tree"),
    ]);
    setMe(profile);
    setWallet(w);
    setTree(t as never);
    setAddress(profile.member.address ?? "");
    setPhotoUrl(profile.member.photoUrl ?? "");
    await refresh();
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/member/me", { method: "PATCH", body: { address, photoUrl } });
      toast.success("Profile updated");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update profile");
    }
  }

  if (!me || !wallet || !tree) {
    return <p className="px-4 py-16 text-center text-muted-foreground">Loading profile…</p>;
  }

  const m = me.member;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <h1 className="font-heading text-3xl font-semibold">Profile</h1>
      <Tabs defaultValue="card">
        <TabsList>
          <TabsTrigger value="card">ID Card</TabsTrigger>
          <TabsTrigger value="genealogy">Genealogy</TabsTrigger>
          <TabsTrigger value="wallet">E-Wallet</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="card" className="pt-4">
          <Card className="mx-auto max-w-md print:shadow-none" id="id-card">
            <CardHeader>
              <CardTitle>Rich Health Care · Distributor ID</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold">{m.name.slice(0, 1)}</span>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-lg font-semibold">{m.name}</p>
                <p className="font-mono">{m.memberCode}</p>
                <p>Sponsor: {me.sponsor ? `${me.sponsor.name} (${me.sponsor.memberCode})` : "—"}</p>
                <p>Joined {formatDate(m.createdAt)}</p>
                <Badge variant={m.kycStatus === "VERIFIED" ? "default" : "secondary"}>{m.kycStatus}</Badge>
              </div>
            </CardContent>
          </Card>
          <Button className="mt-4 print:hidden" variant="outline" onClick={() => window.print()}>
            Print ID card
          </Button>
        </TabsContent>
        <TabsContent value="genealogy" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Genealogy</CardTitle>
            </CardHeader>
            <CardContent>
              <PairingDiagram tree={tree.tree} volume={tree.volume} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="wallet" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>E-Wallet {inr(wallet.balance)}</CardTitle>
            </CardHeader>
            <CardContent>
              {wallet.ledger.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ledger entries yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {wallet.ledger.map((row) => (
                    <li key={row.id} className="flex justify-between gap-4 border-b py-2">
                      <span>
                        {row.type.replaceAll("_", " ")}
                        <span className="block text-muted-foreground">{formatDate(row.createdAt)}</span>
                      </span>
                      <span>{inr(row.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="details" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>General details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">Phone {m.phone} · PAN {m.panNumber ?? "—"} · Rank {m.rank ?? "Distributor"}</p>
              <p className="text-sm text-muted-foreground">
                Phone and PAN changes go through admin / KYC, not this form.
              </p>
              <form className="space-y-3" onSubmit={save}>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Photo URL</Label>
                  <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
                </div>
                <Button type="submit">Save</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
