"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { inr } from "@/lib/money";
import { isActiveMemberStatus, isPendingActivation, statusBadgeVariant, statusLabel, treeStatusLabel } from "@/lib/member-status";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Payment = {
  id: string;
  purpose: string;
  amount: number;
  referenceNo: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  orderId: string | null;
};

type Order = {
  id: string;
  quantity: number;
  status: string;
  createdAt: string;
  product: { id: string; name: string; dp: number };
};

type Product = { id: string; name: string; dp: number; stock: number; active: boolean };

type CompanyBank = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
};

type TeamSummary = {
  weekStart: string;
  weekEnd: string;
  downlineCount: number;
  downlineActive: number;
  downlinePending: number;
  generatedThisWeek: number;
  lifetimeGenerated: number;
  weeklyPayouts: { status: string }[];
};

type Wallet = { balance: number };

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}

function DashboardInner() {
  const { member, refresh } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joiningRef, setJoiningRef] = useState("");
  const [orderQty, setOrderQty] = useState(1);
  const [productId, setProductId] = useState<string>("");
  const [orderRef, setOrderRef] = useState("");
  const [joiningAmount, setJoiningAmount] = useState(999);
  const [companyBank, setCompanyBank] = useState<CompanyBank | null>(null);
  const [bankForm, setBankForm] = useState({
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
  });

  async function load() {
    try {
      const [w, p, o, catalog, plan, teamData, status] = await Promise.all([
        api<Wallet>("/member/wallet"),
        api<Payment[]>("/member/payments"),
        api<Order[]>("/member/orders"),
        api<Product[]>("/products"),
        api<{ joiningAmount: number }>("/plan"),
        api<TeamSummary>("/member/team"),
        api<{ collectionBank: CompanyBank }>("/public/status"),
      ]);
      setWallet(w);
      setPayments(p);
      setOrders(o);
      setProducts(catalog);
      if (!productId && catalog[0]) setProductId(catalog[0].id);
      setJoiningAmount(plan.joiningAmount);
      setTeam(teamData);
      setCompanyBank(status.collectionBank);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!member) return;
    setBankForm({
      accountName: member.accountName ?? "",
      bankName: member.bankName ?? "",
      accountNumber: member.accountNumber ?? "",
      ifsc: member.ifsc ?? "",
      upiId: member.upiId ?? "",
    });
  }, [member]);

  const pendingJoining = payments.find((p) => p.purpose === "JOINING" && p.status === "PENDING");
  const selectedProduct = products.find((p) => p.id === productId);

  async function submitJoining(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/payments/submit", {
        method: "POST",
        body: { purpose: "JOINING", amount: joiningAmount, referenceNo: joiningRef },
      });
      toast.success("Joining payment submitted for review");
      setJoiningRef("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit payment");
    }
  }

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    try {
      const order = await api<Order>("/orders", {
        method: "POST",
        body: { productId, quantity: Number(orderQty) },
      });
      await api("/payments/submit", {
        method: "POST",
        body: {
          purpose: "ORDER",
          orderId: order.id,
          amount: order.product.dp * order.quantity,
          referenceNo: orderRef,
        },
      });
      toast.success("Order placed and payment submitted");
      setOrderRef("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order");
    }
  }

  if (error) {
    return <p className="px-4 py-16 text-center text-destructive">{error}</p>;
  }
  if (!member || !wallet || !team) {
    return <p className="px-4 py-16 text-center text-muted-foreground">Loading dashboard…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Distributor dashboard</p>
          <h1 className="font-heading text-3xl font-semibold">{member.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Code {member.memberCode} · Rank {member.rank ?? "Distributor"}
          </p>
        </div>
        <Badge variant={isPendingActivation(member.status) ? "destructive" : statusBadgeVariant(member.status)}>
          {isPendingActivation(member.status) ? treeStatusLabel(member.status) : statusLabel(member.status)}
        </Badge>
      </div>

      {member.status === "PENDING_PIN" ? (
        <Card className="border-red-500/40 bg-red-50/30">
          <CardHeader>
            <CardTitle className="text-red-800">Awaiting admin activation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the PIN from admin on the activation page. After admin approves, your status becomes Green.
            </p>
            <Link href="/verify-pin" className={buttonVariants()}>
              Submit PIN for activation
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {member.status === "PENDING_APPROVAL" ? (
        <Card className="border-red-500/40 bg-red-50/30">
          <CardHeader>
            <CardTitle className="text-red-800">PIN awaiting admin approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You stay Red in the tree until admin approves. You can still sponsor from Genealogy → Tree.
            </p>
            <Link href="/tree" className={buttonVariants({ variant: "outline" })}>
              Open tree
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {member.status === "PENDING_PAYMENT" ? (
        <Card className="border-accent">
          <CardHeader>
            <CardTitle>Joining payment pending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Transfer {inr(joiningAmount)} to the company account below, then submit the bank UTR.
            </p>
            {companyBank?.accountNumber ? (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p>
                  {companyBank.accountName} · {companyBank.bankName}
                </p>
                <p className="font-mono">A/c {companyBank.accountNumber}</p>
                <p className="font-mono">IFSC {companyBank.ifsc}</p>
              </div>
            ) : null}
            {pendingJoining ? (
              <p>Reference {pendingJoining.referenceNo} is waiting for review.</p>
            ) : (
              <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submitJoining}>
                <Input
                  placeholder="UTR / reference number"
                  value={joiningRef}
                  onChange={(e) => setJoiningRef(e.target.value)}
                  required
                />
                <Button type="submit">Submit {inr(joiningAmount)} payment</Button>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>E Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{inr(wallet.balance)}</p>
            <Link href="/ewallet" className="mt-2 inline-block text-sm text-primary hover:underline">
              View wallet
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Share your code</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl">{member.memberCode}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>My Total Team</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{team.downlineCount}</p>
            <Link href="/genealogy/team" className="mt-2 inline-block text-sm text-primary hover:underline">
              View team
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Balance income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{inr(team.generatedThisWeek)}</p>
            <Link href="/income" className="mt-2 inline-block text-sm text-primary hover:underline">
              View income
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Genealogy</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/tree" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open tree
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weekly payout</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {team.weeklyPayouts[0]?.status.replaceAll("_", " ") ?? "Not generated"}
            </p>
            <Link href="/income/slip" className="mt-2 inline-block text-sm text-primary hover:underline">
              Income slips
            </Link>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bank">
        <TabsList>
          <TabsTrigger value="bank">My bank</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="bank" className="space-y-4 pt-4">
          <form
            className="grid max-w-xl gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("/member/bank", { method: "PATCH", body: bankForm });
                toast.success("Bank details saved");
                await load();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not save bank");
              }
            }}
          >
            {(
              [
                ["accountName", "Account holder"],
                ["bankName", "Bank name"],
                ["accountNumber", "Account number"],
                ["ifsc", "IFSC"],
                ["upiId", "UPI (optional)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <Input
                  value={bankForm[key]}
                  onChange={(e) => setBankForm({ ...bankForm, [key]: e.target.value })}
                  required={key !== "upiId"}
                />
              </div>
            ))}
            <Button type="submit">Save payout bank</Button>
          </form>
        </TabsContent>
        <TabsContent value="orders" className="space-y-6 pt-4">
          {isActiveMemberStatus(member.status) ? (
            <form className="grid gap-3 rounded-xl border p-4 md:grid-cols-4" onSubmit={placeOrder}>
              <div className="space-y-2 md:col-span-2">
                <Label>Product</Label>
                <Select value={productId} onValueChange={(v) => setProductId(String(v ?? ""))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · {inr(p.dp)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Qty</Label>
                <Input type="number" min={1} value={orderQty} onChange={(e) => setOrderQty(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>UTR</Label>
                <Input value={orderRef} onChange={(e) => setOrderRef(e.target.value)} required />
              </div>
              <div className="md:col-span-4">
                <Button type="submit">
                  Order {selectedProduct ? inr(selectedProduct.dp * orderQty) : ""} and submit payment
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Activate your ID before placing product orders.</p>
          )}
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {orders.map((order) => (
                <li key={order.id} className="flex justify-between gap-4 border-b py-2">
                  <span>
                    {order.product.name} × {order.quantity}
                  </span>
                  <span>
                    {inr(order.product.dp * order.quantity)} · {order.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="payments" className="pt-4">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment submissions yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="rounded-lg border p-3">
                  <div className="flex justify-between">
                    <span>
                      {p.purpose} · {inr(p.amount)}
                    </span>
                    <Badge variant={p.status === "APPROVED" ? "default" : "secondary"}>{p.status}</Badge>
                  </div>
                  <p className="text-muted-foreground">UTR {p.referenceNo}</p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
