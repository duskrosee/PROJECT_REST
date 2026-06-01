// typescript
// Файл: `prisma/seed.ts`
// Использует upsert для создания/обновления записей — не требует skipDuplicates.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const coupons = [
    { id: 'c1', code: 'SAVE10', discountPercent: 10, isActive: true },
    { id: 'c2', code: 'PROMO20', discountPercent: 20, isActive: true },
];

async function main() {
    await Promise.all(
        coupons.map((c) =>
            prisma.coupon.upsert({
                where: { id: c.id },
                update: { code: c.code, discountPercent: c.discountPercent, isActive: c.isActive },
                create: c,
            })
        )
    );
    console.log('Seed completed');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
