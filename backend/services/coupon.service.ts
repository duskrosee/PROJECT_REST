import { CouponRepository } from '../repositories/coupon.repository';

export class CouponService {
    private repo = new CouponRepository();

    async validate(code: string) {
        if (!code || !code.trim()) {
            throw new Error('Kod kuponu jest wymagany');
        }
        const coupon = await this.repo.findByCode(code.trim().toUpperCase());
        if (!coupon) throw new Error('Nieprawidłowy kupon');
        if (!coupon.isActive) throw new Error('Kupon nieaktywny');
        if (coupon.expiryDate && coupon.expiryDate < new Date()) {
            throw new Error('Kupon wygasł');
        }
        return coupon;
    }
}
