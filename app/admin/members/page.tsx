"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { AdminNav } from "@/components/admin-nav";
import { api } from "@/lib/api";
import { inr } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type MemberRow = {
  id: string;
  name: string;
  phone: string;
  memberCode: string;
  status: string;
  kycStatus: string;
  issuedPassword: string | null;
  rank: string | null;
  position: string | null;
  wallet: { balance: number } | null;
};

export default function AdminMembersPage() {
  return (
    <RequireAuth role="ADMIN">
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<MemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(search = q) {
    try {
      const data = await api<MemberRow[]>(`/admin/members?q=${encodeURIComponent(search)}`);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load members");
    }
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(id: string, status: "ACTIVE" | "BLOCKED") {
    try {
      await api(`/admin/members/${id}/status`, { method: "PATCH", body: { status } });
      toast.success(status === "BLOCKED" ? "Member blocked" : "Member unblocked");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status");
    }
  }

  async function setRank(id: string, rank: string) {
    try {
      await api(`/admin/members/${id}/rank`, { method: "PATCH", body: { rank } });
      toast.success("Rank updated");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update rank");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <AdminNav />
      <h1 className="font-heading text-3xl font-semibold">Members</h1>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <Input
          placeholder="Search name, phone, or code"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit">Search</Button>
      </form>
      {error ? <p className="text-destructive">{error}</p> : null}
      {!rows ? <p className="text-muted-foreground">Loading members…</p> : null}
      {rows?.length === 0 ? <p className="text-muted-foreground">No members match that search.</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2">Member</th>
              <th>Status</th>
              <th>KYC</th>
              <th>Rank</th>
              <th>Wallet</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="py-3">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-muted-foreground">
                    {row.memberCode} · {row.phone}
                    {row.issuedPassword ? ` · issued password ${row.issuedPassword}` : ""}
                  </p>
                </td>
                <td>
                  <Badge variant={row.status === "ACTIVE" ? "default" : "secondary"}>{row.status}</Badge>
                </td>
                <td>
                  <Badge variant={row.kycStatus === "VERIFIED" ? "default" : "secondary"}>{row.kycStatus}</Badge>
                </td>
                <td>
                  <Input
                    defaultValue={row.rank ?? ""}
                    className="h-8 w-36"
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== row.rank) setRank(row.id, e.target.value);
                    }}
                  />
                </td>
                <td>{inr(row.wallet?.balance ?? 0)}</td>
                <td className="text-right">
                  {row.status === "BLOCKED" ? (
                    <Button variant="outline" onClick={() => setStatus(row.id, "ACTIVE")}>
                      Unblock
                    </Button>
                  ) : row.status === "ACTIVE" ? (
                    <Button variant="destructive" onClick={() => setStatus(row.id, "BLOCKED")}>
                      Block
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">Awaiting payment</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
