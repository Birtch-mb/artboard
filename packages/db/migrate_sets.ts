import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Migrating Sets statuses mapping...');
    const prep = await prisma.set.updateMany({ where: { status: 'IN_PREP' }, data: { status: 'IDEATION' } });
    const ready = await prisma.set.updateMany({ where: { status: 'READY' }, data: { status: 'BUILD' } });
    const shooting = await prisma.set.updateMany({ where: { status: 'SHOOTING' }, data: { status: 'SHOOT' } });
    const struck = await prisma.set.updateMany({ where: { status: 'STRUCK' }, data: { status: 'STRIKE' } });
    console.log('Migrated rows:', { prep: prep.count, ready: ready.count, shooting: shooting.count, struck: struck.count });
}

main().catch(console.error).finally(() => prisma.$disconnect());
