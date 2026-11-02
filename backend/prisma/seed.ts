import bcrypt from "bcryptjs";
import { PrismaClient, type LogStatus } from "@prisma/client";

const prisma = new PrismaClient();

const firstNames = [
  "Aarav", "Maya", "Liam", "Sofia", "Noah", "Priya", "Ethan", "Zara", "Lucas", "Anika",
  "Mateo", "Chloe", "Ravi", "Emma", "Kai", "Isla", "Arjun", "Nora", "Leo", "Mia",
  "Owen", "Aisha", "Finn", "Elena", "Dev", "Ruby", "Sam", "Tara", "Jonas", "Ivy",
  "Neel", "Freya"
];

const lastNames = [
  "Sharma", "Chen", "Patel", "Garcia", "Kim", "Singh", "Walker", "Khan", "Silva", "Mehta",
  "Rossi", "Dubois", "Nair", "Brown", "Tanaka", "Okafor", "Verma", "Lopez", "Muller", "Das"
];

const companies = [
  "Northwind Labs", "Acme Corp", "Lumen Health", "Polaris AI", "Kite Financial",
  "Vertex Studio", "Bluewave", "Sable Analytics", "Orbit Commerce", "Helix Cloud",
  "Mosaic Media", "Atlas Robotics", "Nimbus Data", "Cinder Security", "Terra Logistics"
];

const campaignSeeds = [
  {
    title: "Q1 founder outreach",
    content:
      "Hi {{firstName}}, I noticed {{company}} is scaling its outbound motion. We help teams double reply rates with warmer, verified data. Worth a quick look?",
    status: "completed" as const,
    ageDays: 24
  },
  {
    title: "Deliverability audit follow-up",
    content:
      "Hey {{firstName}}, following up on our deliverability audit. Your domain setup looked healthy, but there are two quick wins for inbox placement. Can I send them over?",
    status: "completed" as const,
    ageDays: 16
  },
  {
    title: "Agency partner program",
    content:
      "Hi {{firstName}}, we are opening a small partner cohort for agencies running cold email at scale. Would a 15 minute walkthrough be useful?",
    status: "completed" as const,
    ageDays: 8
  },
  {
    title: "April product update",
    content:
      "Hi {{firstName}}, we shipped a new sequence builder with reply detection this week. Would love your feedback if you have five minutes.",
    status: "scheduled" as const,
    ageDays: 1
  },
  {
    title: "LinkedIn to email playbook",
    content:
      "Hi {{firstName}}, we put together a short playbook on turning LinkedIn engagement into booked meetings. Want me to send it across?",
    status: "draft" as const,
    ageDays: 0
  }
];

async function main() {
  const passwordHash = await bcrypt.hash("Demo@12345", 10);

  const demo = await prisma.user.upsert({
    where: { email: "demo@outboundx.dev" },
    update: { name: "Demo Operator", passwordHash },
    create: {
      name: "Demo Operator",
      email: "demo@outboundx.dev",
      passwordHash
    }
  });

  const existingContacts = await prisma.contact.count({ where: { userId: demo.id } });
  if (existingContacts > 0) {
    console.log("Seed data already present. Use npm run db:reset to rebuild.");
    return;
  }

  await prisma.contact.createMany({
    data: firstNames.map((firstName, index) => {
      const company = companies[index % companies.length] ?? "Acme Corp";
      const domain = company.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com";
      return {
        userId: demo.id,
        email: `${firstName.toLowerCase()}.${(lastNames[index % lastNames.length] ?? "doe").toLowerCase()}@${domain}`,
        firstName,
        lastName: lastNames[index % lastNames.length] ?? "Doe",
        company,
        phone: `+1 415 555 ${String(1000 + index)}`,
        status: index % 17 === 0 ? ("unsubscribed" as const) : ("active" as const)
      };
    })
  });

  const contactRows = await prisma.contact.findMany({
    where: { userId: demo.id },
    orderBy: { id: "asc" }
  });

  const campaigns = [];
  for (const seed of campaignSeeds) {
    const createdAt = new Date();
    createdAt.setUTCDate(createdAt.getUTCDate() - seed.ageDays);

    const campaign = await prisma.campaign.create({
      data: {
        userId: demo.id,
        title: seed.title,
        content: seed.content,
        status: seed.status,
        audienceType: "all_active",
        createdAt,
        scheduledFor:
          seed.status === "scheduled"
            ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            : null
      }
    });
    campaigns.push(campaign);
  }

  const completed = campaigns.filter((campaign) => campaign.status === "completed");
  let sequence = 0;

  for (const [campaignIndex, campaign] of completed.entries()) {
    const audience = contactRows.filter((_, index) => index % (campaignIndex + 1) !== 0).slice(0, 26);
    const rows = audience.map((contact, index) => {
      sequence += 1;
      const daysAgo = Math.max(0, 20 - campaignIndex * 5 - (index % 6));
      const sentAt = new Date();
      sentAt.setUTCDate(sentAt.getUTCDate() - daysAgo);
      sentAt.setUTCHours(9 + (index % 8), index % 60, 0, 0);

      let status: LogStatus = "sent";
      let openedAt: Date | null = null;
      let clickedAt: Date | null = null;

      if (index % 10 < 4) {
        status = "opened";
        openedAt = new Date(sentAt.getTime() + 45 * 60 * 1000);
      }
      if (index % 10 < 2) {
        status = "clicked";
        openedAt = new Date(sentAt.getTime() + 30 * 60 * 1000);
        clickedAt = new Date(sentAt.getTime() + 90 * 60 * 1000);
      }
      if (index % 10 === 9) {
        status = "sent";
      }

      return {
        campaignId: campaign.id,
        contactId: contact.id,
        status,
        providerMessageId: `seed_${campaign.id}_${contact.id}_${sequence}`,
        sentAt,
        openedAt,
        clickedAt
      };
    });

    await prisma.campaignLog.createMany({ data: rows });
  }

  console.log(`Seeded ${contactRows.length} contacts, ${campaigns.length} campaigns.`);
  console.log("Demo login: demo@outboundx.dev / Demo@12345");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
