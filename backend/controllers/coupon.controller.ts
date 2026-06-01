import { Request, Response } from 'express';
import { CouponService } from '../services/coupon.service';

export const CouponController = {
    async validate(req: Request, res: Response) {
        try {
            const { code } = req.body;
            const coupon = await CouponService.validate(code);
            res.json({ valid: true, discountPercent: coupon.discountPercent });
        } catch (e: any) {
            res.status(400).json({ valid: false, error: e.message });
        }
    },
};
