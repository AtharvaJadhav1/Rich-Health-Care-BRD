import "dotenv/config";
import { prisma } from "./db";
import { placeUnderSponsor } from "./tree";

async function fallbackSponsorId(member: { sponsorId: string | null }) {
  if (member.sponsorId) return member.sponsorId;
  const company = await prisma.companySettings.findUnique({ where: { id: "default" } });
  if (company?.rootMemberCode) {
    const root = await prisma.member.findUnique({ where: { memberCode: company.rootMemberCode } });
    if (root) return root.id;
  }
  const root = await prisma.member.findFirst({
    where: { role: "MEMBER", parentId: null },
    orderBy: { createdAt: "asc" },
  });
  return root?.id ?? null;
}

async function repairMissingPositions() {
  const orphans = await prisma.member.findMany({
    where: {
      parentId: { not: null },
      OR: [{ position: null }, { position: { notIn: ["LEFT", "RIGHT"] } }],
    },
    orderBy: { createdAt: "asc" },
  });
  let fixed = 0;
  for (const member of orphans) {
    if (!member.parentId) continue;
    const leftTaken = await prisma.member.findFirst({
      where: { parentId: member.parentId, position: "LEFT", id: { not: member.id } },
    });
    const rightTaken = await prisma.member.findFirst({
      where: { parentId: member.parentId, position: "RIGHT", id: { not: member.id } },
    });
    if (!leftTaken) {
      await prisma.member.update({ where: { id: member.id }, data: { position: "LEFT" } });
      fixed++;
      continue;
    }
    if (!rightTaken) {
      await prisma.member.update({ where: { id: member.id }, data: { position: "RIGHT" } });
      fixed++;
      continue;
    }
    const sponsorId = await fallbackSponsorId(member);
    if (!sponsorId) {
      console.warn(`repair-db: cannot fix position for ${member.memberCode} (no sponsor/root)`);
      continue;
    }
    const placement = await placeUnderSponsor(sponsorId);
    await prisma.member.update({
      where: { id: member.id },
      data: { parentId: placement.parentId, position: placement.position },
    });
    fixed++;
  }
  return fixed;
}

async function repairDuplicateSlots() {
  let repaired = 0;
  for (let round = 0; round < 32; round++) {
    const members = await prisma.member.findMany({
      where: { parentId: { not: null }, position: { in: ["LEFT", "RIGHT"] } },
      orderBy: { createdAt: "asc" },
    });
    const seen = new Map<string, string>();
    let changed = false;
    for (const member of members) {
      const key = `${member.parentId}:${member.position}`;
      if (!seen.has(key)) {
        seen.set(key, member.id);
        continue;
      }
      const sponsorId = await fallbackSponsorId(member);
      if (!sponsorId) {
        console.warn(`repair-db: cannot relocate duplicate ${member.memberCode} (no sponsor/root)`);
        continue;
      }
      const placement = await placeUnderSponsor(sponsorId);
      await prisma.member.update({
        where: { id: member.id },
        data: { parentId: placement.parentId, position: placement.position },
      });
      repaired++;
      changed = true;
      console.log(
        `repair-db: relocated ${member.memberCode} to ${placement.position} under ${placement.parentId}`,
      );
    }
    if (!changed) break;
  }
  return repaired;
}

async function countDuplicateSlots() {
  const rows = await prisma.$queryRaw<{ parentId: string; position: string; count: bigint }[]>`
    SELECT "parentId", position, COUNT(*)::bigint AS count
    FROM "Member"
    WHERE "parentId" IS NOT NULL AND position IN ('LEFT', 'RIGHT')
    GROUP BY "parentId", position
    HAVING COUNT(*) > 1
  `;
  return rows.length;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("repair-db: skipped (DATABASE_URL not set)");
    return;
  }

  const before = await countDuplicateSlots();
  if (before > 0) {
    console.log(`repair-db: found ${before} duplicate binary slot(s) before repair`);
  }

  const positionsFixed = await repairMissingPositions();
  const slotsFixed = await repairDuplicateSlots();
  const after = await countDuplicateSlots();

  if (after > 0) {
    throw new Error(
      `repair-db: ${after} duplicate binary slot(s) remain after repair. Fix manually before deploy.`,
    );
  }

  if (positionsFixed > 0 || slotsFixed > 0) {
    console.log(`repair-db: repaired ${slotsFixed} duplicate slot(s) and ${positionsFixed} missing position(s)`);
  } else {
    console.log("repair-db: binary tree data looks consistent");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
