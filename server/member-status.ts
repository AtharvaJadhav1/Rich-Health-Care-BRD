/** Member is live in the binary tree (payment-approved or PIN-verified). */
export function isActiveMemberStatus(status: string) {
  return status === "ACTIVE" || status === "GREEN";
}

export function statusLabel(status: string) {
  if (status === "GREEN") return "Green";
  return status.replaceAll("_", " ");
}
