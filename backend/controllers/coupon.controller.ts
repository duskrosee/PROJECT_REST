import { Request, Response } from 'express';
import { CouponService } from '../services/coupon.service';

const couponService = new CouponService();

export const CouponController = {
    async validate(req: Request, res: Response) {
        try {
            const { code } = req.body;
            if (!code || typeof code !== 'string' || !code.trim()) {
                res.status(400).json({ error: 'Kod kuponu jest wymagany' });
                return;
            }
            const coupon = await couponService.validate(code);
            res.json({ code: coupon.code, discountPercent: coupon.discountPercent });
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    },
};
