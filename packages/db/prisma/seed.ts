import { PrismaClient, Role, ProductionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password', 10);

  const adUser = await prisma.user.upsert({
    where: { email: 'ad@artboard.dev' },
    update: { isAdmin: true },
    create: {
      email: 'ad@artboard.dev',
      name: 'Art Director',
      passwordHash,
      isAdmin: true,
    },
  });

  const pdUser = await prisma.user.upsert({
    where: { email: 'pd@artboard.dev' },
    update: {},
    create: {
      email: 'pd@artboard.dev',
      name: 'Production Designer',
      passwordHash,
    },
  });

  const coordUser = await prisma.user.upsert({
    where: { email: 'coord@artboard.dev' },
    update: {},
    create: {
      email: 'coord@artboard.dev',
      name: 'Coordinator',
      passwordHash,
    },
  });

  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@artboard.dev' },
    update: {},
    create: {
      email: 'viewer@artboard.dev',
      name: 'Viewer',
      passwordHash,
    },
  });

  const production = await prisma.production.upsert({
    where: { id: 'seed-production-id-00000000000000' },
    update: {},
    create: {
      id: 'seed-production-id-00000000000000',
      name: 'Test Production',
      status: ProductionStatus.ACTIVE,
    },
  });

  await prisma.productionMember.upsert({
    where: {
      productionId_userId: {
        productionId: production.id,
        userId: adUser.id,
      },
    },
    update: {},
    create: {
      productionId: production.id,
      userId: adUser.id,
      role: Role.ART_DIRECTOR,
    },
  });

  await prisma.productionMember.upsert({
    where: {
      productionId_userId: {
        productionId: production.id,
        userId: pdUser.id,
      },
    },
    update: {},
    create: {
      productionId: production.id,
      userId: pdUser.id,
      role: Role.PRODUCTION_DESIGNER,
    },
  });

  await prisma.productionMember.upsert({
    where: {
      productionId_userId: {
        productionId: production.id,
        userId: coordUser.id,
      },
    },
    update: {},
    create: {
      productionId: production.id,
      userId: coordUser.id,
      role: Role.COORDINATOR,
    },
  });

  await prisma.productionMember.upsert({
    where: {
      productionId_userId: {
        productionId: production.id,
        userId: viewerUser.id,
      },
    },
    update: {},
    create: {
      productionId: production.id,
      userId: viewerUser.id,
      role: Role.VIEWER,
    },
  });

  console.log('Seed complete:', {
    users: [adUser.email, pdUser.email, coordUser.email, viewerUser.email],
    production: production.name,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
