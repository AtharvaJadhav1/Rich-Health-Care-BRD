export function isActiveMemberStatus(status: string) {
  return status === "ACTIVE" || status === "GREEN";
}

export function isStaffRole(role: string) {
  return role === "ADMIN" || role === "SUPPORT";
}

export function isPendingActivation(status: string) {
  return status === "PENDING_PIN" || status === "PENDING_PAYMENT";
}

export function statusLabel(status: string) {
  if (status === "GREEN") return "Green";
  if (status === "ACTIVE") return "Active";
  if (status === "PENDING_PIN") return "Pending activation";
  if (status === "PENDING_PAYMENT") return "Pending payment";
  return status.replaceAll("_", " ");
}

export function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" {
  if (isActiveMemberStatus(status)) return "default";
  if (status === "BLOCKED") return "destructive";
  return "secondary";
}

export function treeStatusColor(status: string): "green" | "red" | "muted" {
  if (isActiveMemberStatus(status)) return "green";
  if (status === "BLOCKED") return "muted";
  if (isPendingActivation(status)) return "red";
  return "muted";
}

export function treeStatusLabel(status: string) {
  if (isActiveMemberStatus(status)) return "Green";
  if (isPendingActivation(status)) return "Red";
  if (status === "BLOCKED") return "Blocked";
  return statusLabel(status);
}
