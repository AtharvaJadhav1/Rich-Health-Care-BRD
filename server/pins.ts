import { prisma } from "./db";
import { generatePinCode, normalizePinCode } from "./credentials";
import { activateMember } from "./tree";

export function publicPin(pin: {
  id: string;
  code: string;
  status: string;
  ownerId: string;
  usedAt: Date | null;
  usedForMemberId: string | null;
  createdAt: Date;
}) {
  return {
    id: pin.id,
    code: pin.code,
    status: pin.status,
    ownerId: pin.ownerId,
    usedAt: pin.usedAt,
    usedForMemberId: pin.usedForMemberId,
    createdAt: pin.createdAt,
  };
}

export async function issuePin(ownerId: string, paymentSubmissionId: string, adminId: string) {
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
        },
      });
    } catch {
      // unique collision — retry
    }
  }
  throw new Error("Could not generate a unique PIN.");
}

async function findPinByCode(raw: string) {
  const normalized = normalizePinCode(raw);
  if (!normalized) return null;
  const exact = await prisma.pin.findUnique({ where: { code: normalized } });
  if (exact) return exact;
  const candidates = await prisma.pin.findMany();
  return candidates.find((pin) => normalizePinCode(pin.code) === normalized) ?? null;
}

export async function consumePinForJoining(opts: { code?: string; pinId?: string }, memberId: string) {
  const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
  if (member.status === "ACTIVE") {
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
  await activateMember(member.id);
  return prisma.pin.findUniqueOrThrow({ where: { id: pin.id } });
}
