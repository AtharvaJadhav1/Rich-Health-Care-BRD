import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { utcDateKey } from "./dates";
import { leftoverFromSnapshot } from "./matching";
import { isActiveMemberStatus } from "./member-status";
import { generateMemberCode } from "./credentials";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function reserveTreeSlot(
  parentId: string,
  position: "LEFT" | "RIGHT",
  db: DbClient = prisma,
) {
  const parent = await db.member.findUnique({ where: { id: parentId } });
  if (!parent || parent.role !== "MEMBER") {
    throw Object.assign(new Error("Placement ID must be a valid distributor in the tree."), {
      statusCode: 400,
    });
  }
  const taken = await db.member.findFirst({
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

/** @deprecated Use reserveTreeSlot inside a transaction. */
export async function placeAtPosition(parentId: string, position: "LEFT" | "RIGHT") {
  return reserveTreeSlot(parentId, position);
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

function pickChild(children: { id: string; position: string | null; createdAt: Date }[], side: "LEFT" | "RIGHT") {
  return children.find((c) => c.position === side) ?? null;
}

export async function findTreeRoot(memberId: string): Promise<string> {
  let currentId = memberId;
  for (let guard = 0; guard < 64; guard++) {
    const row = await prisma.member.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!row?.parentId) return currentId;
    currentId = row.parentId;
  }
  return currentId;
}

export async function depthFromRoot(memberId: string): Promise<number> {
  let depth = 0;
  let currentId = memberId;
  for (let guard = 0; guard < 64; guard++) {
    const row = await prisma.member.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!row?.parentId) return depth;
    depth++;
    currentId = row.parentId;
  }
  return depth;
}

export async function fetchSubtree(rootId: string, depth = 3): Promise<TreeNode | null> {
  const member = await prisma.member.findUnique({ where: { id: rootId } });
  if (!member) return null;

  async function walk(id: string, remaining: number): Promise<TreeNode | null> {
    const node = await prisma.member.findUnique({ where: { id } });
    if (!node) return null;
    const children =
      remaining > 0
        ? await prisma.member.findMany({
            where: { parentId: id },
            orderBy: [{ createdAt: "asc" }],
          })
        : [];
    const leftChild = pickChild(children, "LEFT");
    const rightChild = pickChild(children, "RIGHT");
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

/** Full genealogy from org root through the viewer and their downline. */
export async function fetchMemberTreeView(memberId: string, depthBelow = 5) {
  const rootId = await findTreeRoot(memberId);
  const uplineDepth = await depthFromRoot(memberId);
  const tree = await fetchSubtree(rootId, uplineDepth + depthBelow);
  return { tree, rootId, viewerId: memberId, uplineDepth };
}

export async function nextMemberCode() {
  for (let attempt = 0; attempt < 16; attempt++) {
    const code = generateMemberCode();
    const taken = await prisma.member.findUnique({ where: { memberCode: code } });
    if (!taken) return code;
  }
  throw new Error("Could not generate a unique Member ID.");
}
