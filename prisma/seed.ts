import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_ROLES } from "../src/lib/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, permissions: role.permissions },
      create: {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isSystem: true,
      },
    });
  }
  console.log(`Seeded ${DEFAULT_ROLES.length} default roles.`);

  // Cable is no longer auto-seeded — it's offered as a starter template
  // (src/lib/asset-type-templates.ts) admins can import from Asset Types.
  await prisma.assetType.upsert({
    where: { name: "Generic" },
    update: {},
    create: {
      name: "Generic",
      category: "Uncategorized",
      isBuiltIn: true,
      fieldSchema: [],
    },
  });
  console.log("Seeded built-in asset type (Generic).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
