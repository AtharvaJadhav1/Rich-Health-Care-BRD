export function isActiveMemberStatus(status: string) {
  return status === "ACTIVE" || status === "GREEN";
}

export function isStaffRole(role: string) {
  return role === "ADMIN" || role === "SUPPORT";
}

export function statusLabel(status: string) {
  if (status === "GREEN") return "Green";
  if (status === "PENDING_PIN") return "Pending PIN";
  return status.replaceAll("_", " ");
}

export function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" {
  if (isActiveMemberStatus(status)) return "default";
  if (status === "BLOCKED") return "destructive";
  return "secondary";
}
