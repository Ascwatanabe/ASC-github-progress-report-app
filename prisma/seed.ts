import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeAdmin!";
  const memberPass = process.env.SEED_MEMBER_PASSWORD ?? "ChangeMeMember!";

  const adminHash = await bcrypt.hash(adminPass, 12);
  const memberHash = await bcrypt.hash(memberPass, 12);

  await prisma.user.upsert({
    where: { loginId: "admin" },
    create: {
      loginId: "admin",
      passwordHash: adminHash,
      displayName: "管理者",
      role: "ADMIN",
      email: "admin@example.com",
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { loginId: "demo" },
    create: {
      loginId: "demo",
      passwordHash: memberHash,
      displayName: "デモ作業員",
      role: "MEMBER",
      email: "demo@example.com",
    },
    update: {},
  });

  const sites = ["○○ビル新築工事", "△△マンション改修", "□□工場 設備更新"];
  for (const name of sites) {
    const site = await prisma.site.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    const floors = ["B1階", "1階", "2階", "3階", "屋上"];
    for (const floorName of floors) {
      await prisma.floor.upsert({
        where: { siteId_name: { siteId: site.id, name: floorName } },
        create: { siteId: site.id, name: floorName },
        update: {},
      });
    }
  }

  console.log("Seed OK. admin /", adminPass, "| demo /", memberPass);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
