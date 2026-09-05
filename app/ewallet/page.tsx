"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { PageHero, PageShell } from "@/components/page-shell";
import { api } from "@/lib/api";
import { formatDate, inr } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function EWalletPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [ledgerType, setLedgerType] = useState("ALL");

  useEffect(() => {
    api<Wallet>("/member/wallet")
      .then(setWallet)
      .catch((err) => toast.error(err.message));
  }, []);

  const filteredLedger = useMemo(() => {
    if (!wallet) return [];
    if (ledgerType === "ALL") return wallet.ledger;
    return wallet.ledger.filter((row) => row.type === ledgerType);
  }, [wallet, ledgerType]);

  if (!wallet) {
    return <p className="px-4 py-16 text-center text-muted-foreground">Loading e-wallet…</p>;
  }

  return (
    <PageShell width="6xl" className="space-y-6">
      <PageHero
        title="E Wallet"
        description="Your wallet balance and transaction history. Funds stay here until weekly payout is approved."
      />
      <Card>
        <CardHeader>
          <CardTitle>Available balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-semibold">{inr(wallet.balance)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Select value={ledgerType} onValueChange={(v) => setLedgerType(String(v ?? "ALL"))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="MATCHING_INCOME">Matching income</SelectItem>
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
                        {row.gstCut != null ? `${inr(row.gstCut)} / ${inr(row.adminCut ?? 0)}` : "—"}
                      </td>
                      <td className="max-w-xs text-muted-foreground">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
