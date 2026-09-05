"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { AdminNav } from "@/components/admin-nav";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { inr } from "@/lib/money";
import { isActiveMemberStatus, isPendingActivation, statusBadgeVariant, statusLabel, treeStatusLabel } from "@/lib/member-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
    <RequireAuth role="STAFF">
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { member: staff } = useAuth();
  const isAdmin = staff?.role === "ADMIN";
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

  async function setStatus(id: string, status: "BLOCKED" | "RESTORE") {
    try {
      await api(`/admin/members/${id}/status`, { method: "PATCH", body: { status } });
      toast.success(status === "BLOCKED" ? "Member blocked" : "Member unblocked");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status");
    }
  }

  async function setName(id: string, name: string) {
    try {
      await api(`/admin/members/${id}/name`, { method: "PATCH", body: { name } });
      toast.success("Name updated");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update name");
    }
  }

  async function setPassword(id: string, password: string) {
    try {
      await api(`/admin/members/${id}/password`, { method: "PATCH", body: { password } });
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    }
  }

  async function activateMember(id: string, memberCode: string) {
    try {
      const res = await api<{ pin: { code: string }; member: { status: string } }>(
        `/admin/members/${id}/activate`,
        { method: "POST", body: { generatePin: true } },
      );
      toast.success(`Activated ${memberCode} with PIN ${res.pin.code} — now Green`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not activate member");
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
              {isAdmin ? <th>Rank</th> : null}
              {isAdmin ? <th>Wallet</th> : null}
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
                    {isAdmin && row.issuedPassword ? ` · issued password ${row.issuedPassword}` : ""}
                  </p>
                </td>
                <td>
                  <Badge
                    variant={isPendingActivation(row.status) ? "destructive" : statusBadgeVariant(row.status)}
                  >
                    {isPendingActivation(row.status) ? treeStatusLabel(row.status) : statusLabel(row.status)}
                  </Badge>
                </td>
                <td>
                  <Badge variant={row.kycStatus === "VERIFIED" ? "default" : "secondary"}>{row.kycStatus}</Badge>
                </td>
                {isAdmin ? (
                  <td>
                    <Input
                      defaultValue={row.rank ?? ""}
                      className="h-8 w-36"
                      onBlur={(e) => {
                        if (e.target.value && e.target.value !== row.rank) setRank(row.id, e.target.value);
                      }}
                    />
                  </td>
                ) : null}
                {isAdmin ? <td>{inr(row.wallet?.balance ?? 0)}</td> : null}
                <td className="space-x-2 text-right">
                  {isAdmin ? (
                    <Link href={`/admin/members/${row.id}`} className="text-sm text-primary underline">
                      Report
                    </Link>
                  ) : null}
                  <Dialog>
                    <DialogTrigger render={<Button variant="outline" size="sm" />}>
                      Edit name
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change name · {row.memberCode}</DialogTitle>
                      </DialogHeader>
                      <form
                        className="space-y-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const name = String(new FormData(e.currentTarget).get("name") ?? "");
                          void setName(row.id, name);
                        }}
                      >
                        <div className="space-y-2">
                          <Label htmlFor={`name-${row.id}`}>Full name</Label>
                          <Input id={`name-${row.id}`} name="name" defaultValue={row.name} required />
                        </div>
                        <Button type="submit">Save name</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger render={<Button variant="outline" size="sm" />}>
                      Reset password
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset password · {row.memberCode}</DialogTitle>
                      </DialogHeader>
                      <form
                        className="space-y-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const password = String(new FormData(e.currentTarget).get("password") ?? "");
                          void setPassword(row.id, password);
                        }}
                      >
                        <div className="space-y-2">
                          <Label htmlFor={`pw-${row.id}`}>New password</Label>
                          <Input
                            id={`pw-${row.id}`}
                            name="password"
                            type="password"
                            minLength={8}
                            required
                          />
                        </div>
                        <Button type="submit">Save password</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  {isAdmin && isPendingActivation(row.status) ? (
                    <Button size="sm" onClick={() => activateMember(row.id, row.memberCode)}>
                      Activate PIN
                    </Button>
                  ) : null}
                  {row.status === "BLOCKED" ? (
                    <Button variant="outline" onClick={() => setStatus(row.id, "RESTORE")}>
                      Unblock
                    </Button>
                  ) : isActiveMemberStatus(row.status) || isPendingActivation(row.status) ? (
                    <Button variant="destructive" onClick={() => setStatus(row.id, "BLOCKED")}>
                      Block
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
