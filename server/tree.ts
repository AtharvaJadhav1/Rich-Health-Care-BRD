import { prisma } from "./db";
import { utcDateKey } from "./dates";
import { leftoverFromSnapshot } from "./matching";
import { isActiveMemberStatus } from "./member-status";

export async function placeAtPosition(parentId: string, position: "LEFT" | "RIGHT") {
  const parent = await prisma.member.findUnique({ where: { id: parentId } });
  if (!parent || parent.role !== "MEMBER") {
    throw Object.assign(new Error("Placement ID must be an active distributor in the tree."), {
      statusCode: 400,
    });
  }
  const taken = await prisma.member.findFirst({
    where: { parentId, position },
  });
  if (taken) {
    throw Object.assign(
      new Error(`The ${position === "LEFT" ? "left" : "right"} side under this placement ID is already filled.`),
      { statusCode: 400 },
    );
  }
  return { parentId, position };
}

export async function placeUnderSponsor(sponsorId: string) {
  const queue = [sponsorId];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const children = await prisma.member.findMany({
      where: { parentId },
      orderBy: { createdAt: "asc" },
    });
    const left = children.find((c) => c.position === "LEFT");
    const right = children.find((c) => c.position === "RIGHT");
    if (!left) return { parentId, position: "LEFT" as const };
    if (!right) return { parentId, position: "RIGHT" as const };
    queue.push(left.id, right.id);
  }
  throw new Error("Could not place member in binary tree.");
}

export async function getOrCreateVolume(memberId: string, date = utcDateKey()) {
  const existing = await prisma.binaryVolume.findUnique({
    where: { memberId_date: { memberId, date } },
  });
  if (existing) return existing;
  const previous = await prisma.binaryVolume.findFirst({
    where: { memberId, date: { lt: date } },
    orderBy: { date: "desc" },
  });
  const carry = previous
    ? leftoverFromSnapshot(previous)
    : { leftoverLeft: 0, leftoverRight: 0 };
  return prisma.binaryVolume.create({
    data: {
      memberId,
      date,
      carryLeft: carry.leftoverLeft,
      carryRight: carry.leftoverRight,
    },
  });
}

export async function activateMember(memberId: string) {
  const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
  if (isActiveMemberStatus(member.status)) return member;
  const updated = await prisma.member.update({
    where: { id: memberId },
    data: { status: "ACTIVE", activatedAt: new Date() },
  });
  await countActivationTowardUpline(updated);
  return updated;
}

export async function activateMemberWithPin(memberId: string) {
  const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
  if (isActiveMemberStatus(member.status)) return member;
  const updated = await prisma.member.update({
    where: { id: memberId },
    data: { status: "GREEN", activatedAt: new Date() },
  });
  await countActivationTowardUpline(updated);
  return updated;
}

export async function countActivationTowardUpline(member: { id: string; status: string; position: string | null }) {
  if (!isActiveMemberStatus(member.status)) return;
  let currentId = member.id;
  let currentPosition = member.position;
  const date = utcDateKey();
  while (true) {
    const current = await prisma.member.findUnique({ where: { id: currentId } });
    if (!current?.parentId || !currentPosition) break;
    const parentId = current.parentId;
    await getOrCreateVolume(parentId, date);
    if (currentPosition === "LEFT") {
      await prisma.binaryVolume.update({
        where: { memberId_date: { memberId: parentId, date } },
        data: { leftCount: { increment: 1 } },
      });
    } else {
      await prisma.binaryVolume.update({
        where: { memberId_date: { memberId: parentId, date } },
        data: { rightCount: { increment: 1 } },
      });
    }
    const parent = await prisma.member.findUnique({ where: { id: parentId } });
    currentId = parentId;
    currentPosition = parent?.position ?? null;
  }
}

export type TreeNode = {
  id: string;
  name: string;
  memberCode: string;
  position: string | null;
  status: string;
  rank: string | null;
  left: TreeNode | null;
  right: TreeNode | null;
};

export async function fetchSubtree(rootId: string, depth = 3): Promise<TreeNode | null> {
  const member = await prisma.member.findUnique({ where: { id: rootId } });
  if (!member) return null;
  async function walk(id: string, remaining: number): Promise<TreeNode | null> {
    const node = await prisma.member.findUnique({ where: { id } });
    if (!node) return null;
    const children =
      remaining > 0
        ? await prisma.member.findMany({ where: { parentId: id } })
        : [];
    const leftChild = children.find((c) => c.position === "LEFT");
    const rightChild = children.find((c) => c.position === "RIGHT");
    return {
      id: node.id,
      name: node.name,
      memberCode: node.memberCode,
      position: node.position,
      status: node.status,
      rank: node.rank,
      left: leftChild && remaining > 0 ? await walk(leftChild.id, remaining - 1) : null,
      right: rightChild && remaining > 0 ? await walk(rightChild.id, remaining - 1) : null,
    };
  }
  return walk(rootId, depth);
}

export async function nextMemberCode() {
  const last = await prisma.member.findFirst({
    where: { memberCode: { startsWith: "RHC" } },
    orderBy: { memberCode: "desc" },
  });
  const n = last ? Number(last.memberCode.replace("RHC", "")) + 1 : 1;
  return `RHC${String(n).padStart(4, "0")}`;
}
