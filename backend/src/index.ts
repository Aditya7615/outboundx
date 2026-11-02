import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { app } from "./app";
import { startCampaignScheduler } from "./services/scheduler";

const server = app.listen(env.PORT, () => {
  console.info(`OutboundX API listening on http://localhost:${env.PORT}`);
  console.info(`API docs available at http://localhost:${env.PORT}/api/docs`);
});

const stopScheduler = startCampaignScheduler();

async function shutdown(signal: string): Promise<void> {
  console.info(`${signal} received, shutting down`);
  stopScheduler();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
