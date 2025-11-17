import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "michael.dowdle@hotmail.com" },
    });

    if (user) {
      console.log("User found:", {
        id: user.id,
        email: user.email,
        hasPassword: !!user.passwordHash,
      });

      const testPassword = "Admin123!";
      const isValid = await bcrypt.compare(testPassword, user.passwordHash || "");
      console.log("Password validates:", isValid);
    } else {
      console.log("User not found in database");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

main()
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
