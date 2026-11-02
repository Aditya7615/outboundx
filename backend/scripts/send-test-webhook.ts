import "dotenv/config";
import { createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const type = (process.argv[2] ?? "opened") as "opened" | "clicked";
  const log = await prisma.campaignLog.findFirst({
    orderBy: { id: "desc" },
    where: { providerMessageId: { not: null } }
  });

  if (!log?.providerMessageId) {
    throw new Error("No campaign logs found. Seed the database first.");
  }

  const payload = JSON.stringify({
    messageId: log.providerMessageId,
    type,
    timestamp: new Date().toISOString()
  });
  const secret = process.env.WEBHOOK_SECRET ?? "local-webhook-secret-change-me";
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  const target = process.env.WEBHOOK_URL ?? "http://localhost:4000/api/webhooks/email";

  const response = await fetch(target, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-signature": signature
    },
    body: payload
  });

  console.log(response.status, await response.text());
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
