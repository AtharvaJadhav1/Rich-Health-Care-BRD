import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ensurePlanAndCatalog } from "../server/bootstrap";

const prisma = new PrismaClient();

/** Plan, company row, and product catalog only. Never creates users or deletes member data. */
async function main() {
  await ensurePlanAndCatalog();
  const members = await prisma.member.count();
  console.log(
    members === 0
      ? "Catalog ready. Open /setup to create the live admin and first distributor. No demo users exist."
      : `Catalog ready. ${members} member(s) already in the database; they were left unchanged.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
