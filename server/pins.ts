import { prisma } from "./db";
import { isActiveMemberStatus } from "./member-status";
import { generatePinCode, normalizePinCode } from "./credentials";
import { activateMemberWithPin } from "./tree";

export function publicPin(pin: {
  id: string;
  code: string;
  status: string;
  ownerId: string;
  assignedMemberCode?: string | null;
  usedAt: Date | null;
  usedForMemberId: string | null;
  createdAt: Date;
}) {
  return {
    id: pin.id,
    code: pin.code,
    status: pin.status,
    ownerId: pin.ownerId,
    assignedMemberCode: pin.assignedMemberCode ?? null,
    usedAt: pin.usedAt,
    usedForMemberId: pin.usedForMemberId,
    createdAt: pin.createdAt,
  };
}

export async function listUnusedPinsForOwner(ownerId: string) {
  const pins = await prisma.pin.findMany({
    where: { ownerId, status: "UNUSED" },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(
    pins.map(async (pin) => {
      const transfer = await prisma.pinTransfer.findFirst({
        where: { pinId: pin.id, toMemberId: ownerId },
        orderBy: { transferredAt: "desc" },
      });
      const from = transfer
        ? await prisma.member.findUnique({
            where: { id: transfer.fromMemberId },
            select: { memberCode: true, name: true },
          })
        : null;
      return {
        ...publicPin(pin),
        transferredFrom: from
          ? { memberCode: from.memberCode, name: from.name, at: transfer!.transferredAt }
          : null,
      };
    }),
  );
}

export async function generateAdminPins(opts: {
  adminId: string;
  count: number;
  assignedMemberCode?: string;
}) {
  const count = Math.min(Math.max(opts.count, 1), 50);
  const assignedMemberCode = opts.assignedMemberCode?.trim().toUpperCase() || null;
  if (assignedMemberCode) {
    const target = await prisma.member.findUnique({ where: { memberCode: assignedMemberCode } });
    if (!target || target.role !== "MEMBER") {
      throw Object.assign(new Error("Assign PINs to a valid distributor Member ID."), { statusCode: 400 });
    }
  }
  const created = [];
  for (let n = 0; n < count; n++) {
    created.push(await issuePin(opts.adminId, null, opts.adminId, assignedMemberCode));
  }
  return created;
}

export async function issuePin(
  ownerId: string,
  paymentSubmissionId: string | null,
  adminId: string,
  assignedMemberCode?: string | null,
) {
  for (let i = 0; i < 8; i++) {
    const code = generatePinCode();
    try {
      return await prisma.pin.create({
        data: {
          code,
          ownerId,
          status: "UNUSED",
          paymentSubmissionId,
          generatedBy: adminId,
          assignedMemberCode: assignedMemberCode ?? null,
        },
      });
    } catch {
      // unique collision — retry
    }
  }
  throw new Error("Could not generate a unique PIN.");
}

export async function findPinByCode(raw: string) {
  const normalized = normalizePinCode(raw);
  if (!normalized) return null;
  const exact = await prisma.pin.findUnique({ where: { code: normalized } });
  if (exact) return exact;
  const candidates = await prisma.pin.findMany();
  return candidates.find((pin) => normalizePinCode(pin.code) === normalized) ?? null;
}

/** User submits a PIN — queues admin approval instead of instant activation. */
export async function requestPinActivation(memberId: string, rawCode: string) {
  const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
  if (isActiveMemberStatus(member.status)) {
    throw Object.assign(new Error("Your account is already active."), { statusCode: 400 });
  }
  if (member.status === "BLOCKED") {
    throw Object.assign(new Error("This account is blocked."), { statusCode: 400 });
  }

  const existing = await prisma.pin.findFirst({
    where: { usedForMemberId: memberId, status: "PENDING_APPROVAL" },
  });
  if (existing) {
    throw Object.assign(
      new Error("You already have a PIN waiting for admin approval."),
      { statusCode: 409 },
    );
  }

  const pin = await findPinByCode(rawCode);
  if (!pin) {
    throw Object.assign(new Error("Enter a valid PIN code."), { statusCode: 400 });
  }
  if (pin.status === "PENDING_APPROVAL" && pin.usedForMemberId === memberId) {
    throw Object.assign(new Error("This PIN is already submitted and awaiting admin approval."), {
      statusCode: 409,
    });
  }
  if (pin.status !== "UNUSED") {
    throw Object.assign(new Error("This PIN is not available."), { statusCode: 400 });
  }
  if (pin.assignedMemberCode && pin.assignedMemberCode !== member.memberCode) {
    throw Object.assign(new Error("This PIN is assigned to a different Member ID."), { statusCode: 400 });
  }

  const claimed = await prisma.pin.updateMany({
    where: { id: pin.id, status: "UNUSED" },
    data: {
      status: "PENDING_APPROVAL",
      usedForMemberId: member.id,
      usedAt: new Date(),
    },
  });
  if (claimed.count !== 1) {
    throw Object.assign(new Error("This PIN was just used by someone else. Try again."), { statusCode: 409 });
  }
  await prisma.member.update({
    where: { id: member.id },
    data: { status: "PENDING_APPROVAL" },
  });
  return prisma.pin.findUniqueOrThrow({ where: { id: pin.id } });
}

/** Admin approves a queued PIN — member turns Green. */
export async function approvePinActivation(pinId: string) {
  const pin = await prisma.pin.findUnique({ where: { id: pinId } });
  if (!pin || pin.status !== "PENDING_APPROVAL" || !pin.usedForMemberId) {
    throw Object.assign(new Error("No pending activation found for this PIN."), { statusCode: 404 });
  }
  const member = await prisma.member.findUnique({ where: { id: pin.usedForMemberId } });
  if (!member || member.role !== "MEMBER") {
    throw Object.assign(new Error("Member not found."), { statusCode: 404 });
  }
  if (isActiveMemberStatus(member.status)) {
    await prisma.pin.update({
      where: { id: pinId },
      data: { status: "USED", ownerId: member.id },
    });
    throw Object.assign(new Error("Member is already active."), { statusCode: 400 });
  }

  const claimed = await prisma.pin.updateMany({
    where: { id: pinId, status: "PENDING_APPROVAL" },
    data: {
      status: "USED",
      usedAt: new Date(),
      ownerId: member.id,
    },
  });
  if (claimed.count !== 1) {
    throw Object.assign(new Error("This activation was already processed."), { statusCode: 409 });
  }
  await activateMemberWithPin(member.id);
  return prisma.pin.findUniqueOrThrow({ where: { id: pinId } });
}

export async function rejectPinActivation(pinId: string) {
  const pin = await prisma.pin.findUnique({ where: { id: pinId } });
  if (!pin || pin.status !== "PENDING_APPROVAL") {
    throw Object.assign(new Error("No pending activation found for this PIN."), { statusCode: 404 });
  }
  await prisma.$transaction(async (tx) => {
    await tx.pin.update({
      where: { id: pinId },
      data: {
        status: "UNUSED",
        usedForMemberId: null,
        usedAt: null,
      },
    });
    if (pin.usedForMemberId) {
      await tx.member.update({
        where: { id: pin.usedForMemberId },
        data: { status: "PENDING_PIN" },
      });
    }
  });
  return { ok: true };
}

export async function transferPinToMember(
  pinId: string,
  recipientMemberCode: string,
  opts?: { fromMemberId?: string; asAdmin?: boolean },
) {
  const recipient = await prisma.member.findUnique({
    where: { memberCode: recipientMemberCode.trim().toUpperCase() },
  });
  if (!recipient || recipient.role !== "MEMBER") {
    throw Object.assign(new Error("Recipient Member ID was not found."), { statusCode: 400 });
  }
  const pin = await prisma.pin.findUnique({ where: { id: pinId } });
  if (!pin) {
    throw Object.assign(new Error("PIN not found."), { statusCode: 404 });
  }
  if (pin.status !== "UNUSED") {
    throw Object.assign(new Error("Only unused PINs can be transferred."), { statusCode: 400 });
  }
  if (opts?.fromMemberId && !opts.asAdmin && pin.ownerId !== opts.fromMemberId) {
    throw Object.assign(new Error("You do not own this PIN."), { statusCode: 403 });
  }
  const senderId = pin.ownerId;
  if (recipient.id === senderId) {
    throw Object.assign(new Error("Recipient already owns this PIN."), { statusCode: 400 });
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.pin.update({
      where: { id: pinId },
      data: {
        ownerId: recipient.id,
        assignedMemberCode: recipient.memberCode,
      },
    });
    await tx.pinTransfer.create({
      data: {
        pinId,
        fromMemberId: senderId,
        toMemberId: recipient.id,
      },
    });
    return updated;
  });
}

export async function consumePinForJoining(opts: { code?: string; pinId?: string }, memberId: string) {
  const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
  if (isActiveMemberStatus(member.status)) {
    throw new Error("This account is already active.");
  }
  if (member.status === "BLOCKED") {
    throw new Error("This account is blocked.");
  }

  const pin = opts.pinId
    ? await prisma.pin.findUnique({ where: { id: opts.pinId } })
    : opts.code
      ? await findPinByCode(opts.code)
      : null;

  if (!pin) {
    throw new Error("Enter a valid unused PIN code.");
  }
  if (pin.assignedMemberCode && pin.assignedMemberCode !== member.memberCode) {
    throw new Error("This PIN is assigned to a different Member ID.");
  }
  if (pin.status !== "UNUSED") {
    throw new Error("This PIN has already been used.");
  }

  const claimed = await prisma.pin.updateMany({
    where: { id: pin.id, status: "UNUSED" },
    data: {
      status: "USED",
      usedAt: new Date(),
      usedForMemberId: member.id,
      ownerId: member.id,
    },
  });
  if (claimed.count !== 1) {
    throw new Error("This PIN has already been used.");
  }
  await activateMemberWithPin(member.id);
  return prisma.pin.findUniqueOrThrow({ where: { id: pin.id } });
}

export async function adminActivateMemberWithPin(opts: {
  memberId: string;
  adminId: string;
  pinId?: string;
  pinCode?: string;
  generateIfMissing?: boolean;
}) {
  const member = await prisma.member.findUnique({ where: { id: opts.memberId } });
  if (!member || member.role !== "MEMBER") {
    throw Object.assign(new Error("Member not found."), { statusCode: 404 });
  }
  if (isActiveMemberStatus(member.status)) {
    throw Object.assign(new Error("This member is already active."), { statusCode: 400 });
  }
  if (member.status === "BLOCKED") {
    throw Object.assign(new Error("Unblock the member before activating."), { statusCode: 400 });
  }

  let pinId = opts.pinId;
  if (!pinId && opts.pinCode) {
    const pin = await findPinByCode(opts.pinCode);
    if (!pin) {
      throw Object.assign(new Error("Enter a valid unused PIN code."), { statusCode: 400 });
    }
    pinId = pin.id;
  }
  if (!pinId && opts.generateIfMissing) {
    const created = await issuePin(opts.adminId, null, opts.adminId, member.memberCode);
    pinId = created.id;
  }
  if (!pinId) {
    throw Object.assign(new Error("Select a PIN or choose to generate one."), { statusCode: 400 });
  }

  return consumePinForJoining({ pinId }, member.id);
}
