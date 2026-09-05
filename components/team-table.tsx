"use client";

import { Badge } from "@/components/ui/badge";
import { formatDate, inr } from "@/lib/money";
import { statusBadgeVariant, statusLabel } from "@/lib/member-status";

export type TeamSummary = {
  downline: {
    id: string;
    name: string;
    memberCode: string;
    phone: string;
    status: string;
    position: string | null;
    joiningPaymentStatus: string | null;
    generatedAmount: number;
    createdAt: string;
  }[];
};

export function TeamTable({ team }: { team: TeamSummary }) {
  if (team.downline.length === 0) {
    return <p className="text-sm text-muted-foreground">No members under you yet. Share your sponsor code.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-2">Member</th>
            <th>Leg</th>
            <th>Joined date</th>
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
              <td>{formatDate(row.createdAt)}</td>
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
  );
}
