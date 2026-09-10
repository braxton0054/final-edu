import { prisma } from "@mtanda/database";
import { hashPassword } from "../apps/web/lib/auth/passwords";

async function main() {
  const email = "braxtonkipchumba7@gmail.com";
  const password = process.argv[2] ?? "";
  if (!password) throw new Error("password arg required");

  const existing = await prisma.user.count({ where: { userType: "PLATFORM_ADMIN" } });
  if (existing > 0) {
    console.log("A super admin already exists — refusing.");
    return;
  }
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      userType: "PLATFORM_ADMIN",
      firstName: "Super",
      lastName: "Admin",
      emailVerified: true,
    },
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "platform.super_admin_bootstrapped" },
  });
  console.log("created super admin:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
