/** Member is live in the binary tree (payment-approved or PIN-verified). */
export function isActiveMemberStatus(status: string) {
  return status === "ACTIVE" || status === "GREEN";
}

export function isPendingActivation(status: string) {
  return status === "PENDING_PIN" || status === "PENDING_PAYMENT" || status === "PENDING_APPROVAL";
}

/** Red / pending members may still sponsor new registrations. */
export function canSponsorMembers(status: string) {
  return status !== "BLOCKED";
}

export function statusLabel(status: string) {
  if (status === "GREEN") return "Green";
  if (status === "PENDING_APPROVAL") return "Awaiting approval";
  return status.replaceAll("_", " ");
}
