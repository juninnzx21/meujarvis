import bcrypt from "bcrypt";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function askMissing() {
  const rl = createInterface({ input, output });
  try {
    const name = process.env.ADMIN_NAME || await rl.question("Nome do admin: ");
    const email = process.env.ADMIN_EMAIL || await rl.question("Email do admin: ");
    const password = process.env.ADMIN_PASSWORD || await rl.question("Senha do admin: ");
    return { name: name.trim(), email: email.trim().toLowerCase(), password };
  } finally {
    rl.close();
  }
}

async function main() {
  const { name, email, password } = await askMissing();
  if (!name || !email || password.length < 12) {
    throw new Error("Informe nome, email e senha com ao menos 12 caracteres.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role: "admin", passwordHash },
    create: { name, email, role: "admin", passwordHash }
  });
  console.log(`Admin criado/atualizado com seguranca: ${user.email}`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : "Erro ao criar admin.");
    await prisma.$disconnect();
    process.exit(1);
  });
