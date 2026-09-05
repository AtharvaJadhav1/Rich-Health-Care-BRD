"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PinRow = {
  id: string;
  code: string;
  status: string;
  usedAt: string | null;
  usedForMemberId: string | null;
  createdAt: string;
  assignedMemberCode?: string | null;
  transferredFrom?: { memberCode: string; name: string; at: string } | null;
};


export function PinControls({ onChanged }: { onChanged?: () => void }) {
  const { member } = useAuth();
  const [unused, setUnused] = useState<PinRow[]>([]);
  const [used, setUsed] = useState<PinRow[]>([]);
  const [transferId, setTransferId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [useCode, setUseCode] = useState("");

  async function load() {
    const [u, d] = await Promise.all([api<PinRow[]>("/pins/unused"), api<PinRow[]>("/pins/used")]);
    setUnused(u);
    setUsed(d);
    if (!transferId && u[0]) setTransferId(u[0].id);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function transfer(e: FormEvent) {
    e.preventDefault();
    try {
      await api(`/pins/${transferId}/transfer`, {
        method: "POST",
        body: { memberCode: recipient },
      });
      toast.success("PIN transferred");
      setRecipient("");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not transfer PIN");
    }
  }

  async function usePin(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/pins/use", { method: "POST", body: { code: useCode } });
      toast.success("PIN used. Your ID is now active.");
      setUseCode("");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not use PIN");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Pin Transfer</CardTitle>
        </CardHeader>
        <CardContent>
          {unused.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unused PINs to transfer.</p>
          ) : (
            <form className="space-y-3" onSubmit={transfer}>
              <div className="space-y-2">
                <Label>Unused PIN</Label>
                <Select value={transferId} onValueChange={(v) => setTransferId(String(v ?? ""))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unused.map((pin) => (
                      <SelectItem key={pin.id} value={pin.id}>
                        {pin.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Recipient Member ID</Label>
                <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
              </div>
              <Button type="submit">Transfer</Button>
            </form>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pin Unused</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {unused.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unused PINs.</p>
          ) : (
            unused.map((pin) => (
              <div key={pin.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div>
                  <span className="font-mono text-sm">{pin.code}</span>
                  {pin.transferredFrom ? (
                    <p className="text-xs text-muted-foreground">
                      Transferred from {pin.transferredFrom.name} ({pin.transferredFrom.memberCode})
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">UNUSED</Badge>
                  {member?.status === "PENDING_PAYMENT" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await api("/pins/use", { method: "POST", body: { pinId: pin.id } });
                          toast.success("PIN used. Your ID is now active.");
                          await load();
                          onChanged?.();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Could not use PIN");
                        }
                      }}
                    >
                      Use
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pin Used</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {used.length === 0 ? (
            <p className="text-sm text-muted-foreground">No used PINs.</p>
          ) : (
            used.map((pin) => (
              <div key={pin.id} className="rounded-lg border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono">{pin.code}</span>
                  <Badge>USED</Badge>
                </div>
                <p className="text-muted-foreground">{pin.usedAt ? formatDate(pin.usedAt) : ""}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Use a PIN instead of joining UTR</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={usePin}>
            <Input
              placeholder="PIN code transferred to you"
              value={useCode}
              onChange={(e) => setUseCode(e.target.value)}
              required
            />
            <Button type="submit">Activate with PIN</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
