import { Router } from 'express';
import { UserController } from './controllers/user.controller';
import { FuelController } from './controllers/fuel.controller';
import { StationController } from './controllers/station.controller';
import { TransactionController } from './controllers/transaction.controller';
import { AuditLogController } from './controllers/audit.controller';
import { requireAuth, requireAdmin } from './middlewares/auth.middleware';
import { CouponController } from './controllers/coupon.controller';
import { CouponService } from './services/coupon.service';
import { CheckoutService } from './services/checkout.service';
import { TransactionService } from './services/transaction.service';
import { TransactionRepository } from './repositories/transaction.repository';

export const apiRouter = Router();

const userController = new UserController();
const fuelController = new FuelController();
const stationController = new StationController();
const transactionController = new TransactionController();
const auditController = new AuditLogController();

const couponService = new CouponService();
const checkoutService = new CheckoutService();
const transactionService = new TransactionService();
const transactionRepo = new TransactionRepository();

// Coupon & checkout (public)
apiRouter.post('/api/coupons/validate', (req, res) => CouponController.validate(req, res));

apiRouter.post('/api/checkout/create', async (req, res) => {
    try {
        const { stationId, fuelId, liters, buyerName, worker, couponCode, calcType, amountPLN } = req.body;

        if (!stationId || !fuelId || !buyerName) {
            res.status(400).json({ error: 'Walidacja: stationId, fuelId oraz buyerName są wymagane.' });
            return;
        }
        if (!calcType || !['liters', 'price'].includes(calcType)) {
            res.status(400).json({ error: 'Walidacja: calcType musi być "liters" lub "price".' });
            return;
        }
        if (calcType === 'liters' && (liters === undefined || Number(liters) <= 0)) {
            res.status(400).json({ error: 'Walidacja: Ilość litrów musi być liczbą większą od zera.' });
            return;
        }
        if (calcType === 'price' && (amountPLN === undefined || Number(amountPLN) <= 0)) {
            res.status(400).json({ error: 'Walidacja: Kwota (amountPLN) musi być liczbą większą od zera.' });
            return;
        }

        if (couponCode) {
            await couponService.validate(couponCode);
        }

        const token = checkoutService.create({
            stationId,
            fuelId,
            liters,
            buyerName,
            worker,
            couponCode,
            calcType,
            amountPLN: calcType === 'price' ? Number(amountPLN) : undefined,
        });

        res.json({ token });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

apiRouter.post('/api/checkout/:token/confirm', async (req, res) => {
    const token = req.params.token;
    const { paymentMethod } = req.body;

    let session;
    try {
        session = checkoutService.getValidSession(token);
    } catch (e: any) {
        const existing = await transactionRepo.findByCheckoutToken(token);
        if (existing) {
            res.json(existing);
            return;
        }
        res.status(400).json({ error: e.message });
        return;
    }

    try {
        const receipt = await transactionService.createTransaction(
            session.stationId,
            session.fuelId,
            session.liters,
            session.buyerName,
            session.worker,
            paymentMethod,
            'opłacona',
            session.calcType,
            session.amountPLN,
            session.couponCode,
            session.token
        );
        checkoutService.complete(token);
        res.json(receipt);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// Auth Endpoints
apiRouter.post('/auth/login', (req, res) => userController.login(req, res));
apiRouter.post('/api/auth/login', (req, res) => userController.login(req, res));

// User Endpoints (admin only)
apiRouter.get('/users', requireAdmin, (req, res) => userController.getAll(req, res));
apiRouter.get('/api/users', requireAdmin, (req, res) => userController.getAll(req, res));
apiRouter.get('/users/:id', requireAdmin, (req, res) => userController.getById(req, res));
apiRouter.get('/api/users/:id', requireAdmin, (req, res) => userController.getById(req, res));
apiRouter.post('/users', requireAdmin, (req, res) => userController.create(req, res));
apiRouter.post('/api/users', requireAdmin, (req, res) => userController.create(req, res));
apiRouter.put('/users/:id', requireAdmin, (req, res) => userController.update(req, res));
apiRouter.put('/api/users/:id', requireAdmin, (req, res) => userController.update(req, res));
apiRouter.delete('/users/:id', requireAdmin, (req, res) => userController.delete(req, res));
apiRouter.delete('/api/users/:id', requireAdmin, (req, res) => userController.delete(req, res));

// Fuel Endpoints
apiRouter.get('/fuels', (req, res) => fuelController.getAll(req, res));
apiRouter.get('/api/fuels', (req, res) => fuelController.getAll(req, res));
apiRouter.get('/fuels/:id', (req, res) => fuelController.getById(req, res));
apiRouter.get('/api/fuels/:id', (req, res) => fuelController.getById(req, res));
apiRouter.post('/fuels', requireAdmin, (req, res) => fuelController.create(req, res));
apiRouter.post('/api/fuels', requireAdmin, (req, res) => fuelController.create(req, res));
apiRouter.put('/fuels/:id', requireAdmin, (req, res) => fuelController.update(req, res));
apiRouter.put('/api/fuels/:id', requireAdmin, (req, res) => fuelController.update(req, res));
apiRouter.delete('/fuels/:id', requireAdmin, (req, res) => fuelController.delete(req, res));
apiRouter.delete('/api/fuels/:id', requireAdmin, (req, res) => fuelController.delete(req, res));

// Station Endpoints
apiRouter.get('/stations', (req, res) => stationController.getAll(req, res));
apiRouter.get('/api/stations', (req, res) => stationController.getAll(req, res));
apiRouter.get('/stations/:id', (req, res) => stationController.getById(req, res));
apiRouter.get('/api/stations/:id', (req, res) => stationController.getById(req, res));
apiRouter.post('/stations', requireAdmin, (req, res) => stationController.create(req, res));
apiRouter.post('/api/stations', requireAdmin, (req, res) => stationController.create(req, res));
apiRouter.put('/stations/:id', requireAdmin, (req, res) => stationController.update(req, res));
apiRouter.put('/api/stations/:id', requireAdmin, (req, res) => stationController.update(req, res));
apiRouter.delete('/stations/:id', requireAdmin, (req, res) => stationController.delete(req, res));
apiRouter.delete('/api/stations/:id', requireAdmin, (req, res) => stationController.delete(req, res));

// Transaction Endpoints
apiRouter.post('/stations/:id/transactions', requireAuth, (req, res) => transactionController.create(req, res));
apiRouter.post('/api/stations/:id/transactions', requireAuth, (req, res) => transactionController.create(req, res));
apiRouter.get('/stations/:id/transactions', (req, res) => transactionController.getByStation(req, res));
apiRouter.get('/api/stations/:id/transactions', (req, res) => transactionController.getByStation(req, res));
apiRouter.get('/transactions', (req, res) => transactionController.getAll(req, res));
apiRouter.get('/api/transactions', (req, res) => transactionController.getAll(req, res));

// Audit Logs (admin only)
apiRouter.get('/api/logs', requireAdmin, (req, res) => auditController.getLogs(req, res));
