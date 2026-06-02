import { prisma } from '../database';

export class CouponRepository {
    async findByCode(code: string) {
        return prisma.coupon.findUnique({ where: { code } });
    }
}
