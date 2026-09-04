"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/components/auth-provider";
import { PairingDiagram, TreeNode } from "@/components/pairing-diagram";
import { api } from "@/lib/api";
import { formatDate, inr } from "@/lib/money";
import { isActiveMemberStatus, statusBadgeVariant, statusLabel, treeStatusLabel } from "@/lib/member-status";
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

type Wallet = {
  balance: number;
  ledger: {
    id: string;
    type: string;
    amount: number;
    grossAmount: number | null;
    gstCut: number | null;
    adminCut: number | null;
    note: string | null;
    createdAt: string;
  }[];
};

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
  downlineBlocked: number;
  generatedThisWeek: number;
  matchingThisWeek: number;
  retailThisWeek: number;
  lifetimeGenerated: number;
  walletBalance: number;
  downline: {
    id: string;
    name: string;
    memberCode: string;
    phone: string;
    status: string;
    position: string | null;
    joiningPaymentStatus: string | null;
    generatedAmount: number;
    walletBalance: number;
  }[];
  weeklyPayouts: {
    id: string;
    weekStart: string;
    weekEnd: string;
    generatedAmount: number;
    downlineTotal: number;
    status: string;
    adminNote: string | null;
  }[];
};

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
  const [tree, setTree] = useState<{
    tree: TreeNode;
    viewerId?: string;
    focusId?: string;
    volume: {
      leftCount: number;
      rightCount: number;
      carryLeft: number;
      carryRight: number;
      pairsMatched: number;
      payout: number;
    };
  } | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joiningRef, setJoiningRef] = useState("");
  const [orderQty, setOrderQty] = useState(1);
  const [productId, setProductId] = useState<string>("");
  const [orderRef, setOrderRef] = useState("");
  const [ledgerType, setLedgerType] = useState("ALL");
  const [joiningAmount, setJoiningAmount] = useState(999);
  const [companyBank, setCompanyBank] = useState<CompanyBank | null>(null);
  const [bankForm, setBankForm] = useState({
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
  });

  async function loadTree(focusId?: string) {
    const path = focusId ? `/member/tree?focus=${encodeURIComponent(focusId)}` : "/member/tree";
    const t = await api<{
      tree: TreeNode;
      viewerId?: string;
      focusId?: string;
      volume: never;
    }>(path);
    setTree(t as never);
  }

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
      await loadTree();
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

  const filteredLedger = useMemo(() => {
    if (!wallet) return [];
    if (ledgerType === "ALL") return wallet.ledger;
    return wallet.ledger.filter((row) => row.type === ledgerType);
  }, [wallet, ledgerType]);

  const pendingJoining = payments.find((p) => p.purpose === "JOINING" && p.status === "PENDING");
  const selectedProduct = products.find((p) => p.id === productId);

  async function submitJoining(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/payments/submit", {
        method: "POST",
        body: {
          purpose: "JOINING",
          amount: joiningAmount,
          referenceNo: joiningRef,
        },
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
  if (!member || !wallet || !tree || !team) {
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
        <Badge
          variant={member.status === "PENDING_PIN" ? "destructive" : statusBadgeVariant(member.status)}
        >
          {member.status === "PENDING_PIN" ? treeStatusLabel(member.status) : statusLabel(member.status)}
        </Badge>
      </div>

      {member.status === "PENDING_PIN" ? (
        <Card className="border-red-500/40 bg-red-50/30">
          <CardHeader>
            <CardTitle className="text-red-800">Awaiting admin activation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Registration is complete. Your tree position is reserved and shown as{" "}
              <span className="font-medium text-red-700">Red</span>. Enter the PIN from admin on the activation page.
              After admin approves, your status becomes{" "}
              <span className="font-medium text-emerald-700">Green</span>.
            </p>
            <p className="text-sm font-medium">Member ID: {member.memberCode}</p>
            <Link href="/verify-pin" className={buttonVariants()}>
              Submit PIN for activation
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
              Transfer {inr(joiningAmount)} to the company account below, then submit the bank UTR. You stay off
              matching until admin confirms the money.
            </p>
            {companyBank?.accountNumber ? (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p>
                  {companyBank.accountName} · {companyBank.bankName}
                </p>
                <p className="font-mono">A/c {companyBank.accountNumber}</p>
                <p className="font-mono">IFSC {companyBank.ifsc}</p>
                {companyBank.upiId ? <p>UPI {companyBank.upiId}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-destructive">
                Company bank is not set yet. Ask admin to save it under Plan config.
              </p>
            )}
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
            {payments
              .filter((p) => p.purpose === "JOINING" && p.status === "REJECTED")
              .map((p) => (
                <p key={p.id} className="text-sm text-destructive">
                  Rejected: {p.adminNote}. Submit a new reference to try again.
                </p>
              ))}
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const code = String(new FormData(form).get("pinCode") ?? "");
                try {
                  await api("/pins/use", { method: "POST", body: { code } });
                  toast.success("PIN used. Your ID is now active.");
                  form.reset();
                  await load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not use PIN");
                }
              }}
            >
              <Input name="pinCode" placeholder="Or activate with a PIN code" required />
              <Button type="submit" variant="outline">
                Use PIN
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{inr(wallet.balance)}</p>
            <p className="text-sm text-muted-foreground">Available until weekly payout is approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s matching</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{tree.volume.pairsMatched} pairs</p>
            <p className="text-sm text-muted-foreground">{inr(tree.volume.payout)} net credited today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Share your code</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl">{member.memberCode}</p>
            <p className="text-sm text-muted-foreground">Share this ID so others can receive PIN transfers.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Team under you</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{team.downlineCount}</p>
            <p className="text-sm text-muted-foreground">
              {team.downlineActive} active · {team.downlinePending} awaiting joining payment
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Generated this week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{inr(team.generatedThisWeek)}</p>
            <p className="text-sm text-muted-foreground">
              {team.weekStart} to {team.weekEnd} · lifetime {inr(team.lifetimeGenerated)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weekly payout</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {team.weeklyPayouts[0]?.status.replaceAll("_", " ") ?? "Not generated"}
            </p>
            <p className="text-sm text-muted-foreground">
              Admin reviews each member report every week before releasing payment.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pairing diagram</CardTitle>
        </CardHeader>
        <CardContent>
          <PairingDiagram
            tree={tree.tree}
            volume={tree.volume}
            viewerId={tree.viewerId ?? member.id}
            focusId={tree.focusId}
            onFocusMember={(id) => loadTree(id).catch((err) => toast.error(err.message))}
            onResetFocus={() => loadTree().catch((err) => toast.error(err.message))}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger">Transactions</TabsTrigger>
          <TabsTrigger value="team">My team</TabsTrigger>
          <TabsTrigger value="weekly">Weekly payouts</TabsTrigger>
          <TabsTrigger value="bank">My bank</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="ledger" className="space-y-4 pt-4">
          <div className="max-w-xs">
            <Select value={ledgerType} onValueChange={(v) => setLedgerType(String(v ?? "ALL"))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="RETAIL_INCOME">Retail income</SelectItem>
                <SelectItem value="WEEKLY_PAYOUT">Weekly payout</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filteredLedger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ledger entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Date</th>
                    <th>Type</th>
                    <th>Net</th>
                    <th>GST / Admin</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="py-2">{formatDate(row.createdAt)}</td>
                      <td>{row.type.replaceAll("_", " ")}</td>
                      <td>{inr(row.amount)}</td>
                      <td>
                        {row.gstCut != null
                          ? `${inr(row.gstCut)} / ${inr(row.adminCut ?? 0)}`
                          : "—"}
                      </td>
                      <td className="max-w-xs text-muted-foreground">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
        <TabsContent value="team" className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Everyone placed under you in the binary tree, with joining payment status and how much they have generated.
          </p>
          {team.downline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members under you yet. Share your sponsor code.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Member</th>
                    <th>Leg</th>
                    <th>Account</th>
                    <th>Joining payment</th>
                    <th>Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {team.downline.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="py-2">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-muted-foreground">
                          {row.memberCode} · {row.phone}
                        </p>
                      </td>
                      <td>{row.position ?? "—"}</td>
                      <td>
                        <Badge variant={statusBadgeVariant(row.status)}>{statusLabel(row.status)}</Badge>
                      </td>
                      <td>{row.joiningPaymentStatus ?? "Not submitted"}</td>
                      <td>{inr(row.generatedAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
        <TabsContent value="weekly" className="space-y-4 pt-4">
          {team.weeklyPayouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No weekly reports yet. After matching runs, admin generates this week&apos;s payout reports and approves
              them.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {team.weeklyPayouts.map((row) => (
                <li key={row.id} className="rounded-lg border p-3">
                  <div className="flex justify-between gap-3">
                    <span>
                      {row.weekStart} → {row.weekEnd} · {inr(row.generatedAmount)} · {row.downlineTotal} in team
                    </span>
                    <Badge variant={row.status === "APPROVED" ? "default" : "secondary"}>{row.status}</Badge>
                  </div>
                  {row.adminNote ? <p className="text-muted-foreground">Admin: {row.adminNote}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="bank" className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Weekly payouts are transferred to this account after admin approval. Keep IFSC and account number
            correct.
          </p>
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
                <Input
                  type="number"
                  min={1}
                  value={orderQty}
                  onChange={(e) => setOrderQty(Number(e.target.value))}
                />
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
                  {p.adminNote ? <p>Admin: {p.adminNote}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-sm text-muted-foreground">
        Need the public catalog?{" "}
        <Link href="/products" className={buttonVariants({ variant: "link" })}>
          View products
        </Link>
      </p>
    </div>
  );
}
