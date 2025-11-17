import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_USER = {
  email: "michael.dowdle@hotmail.com",
  name: "Michael Dowdle",
  password: "Admin123!",
};

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: SEED_USER.email },
  });

  const passwordHash = await bcrypt.hash(SEED_USER.password, 10);

  if (existing) {
    if (!existing.passwordHash) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash },
      });
      console.log("Updated existing user with password hash.");
    } else {
      console.log("User already exists with credentials. Skipping.");
    }
    return;
  }

  await prisma.user.create({
    data: {
      email: SEED_USER.email,
      name: SEED_USER.name,
      passwordHash,
    },
  });

  console.log(`Seeded user ${SEED_USER.email}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed user", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
