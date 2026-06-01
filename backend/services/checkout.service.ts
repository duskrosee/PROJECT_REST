import { randomUUID } from 'crypto';

interface CheckoutSession {
    token: string;
    stationId: string;
    fuelId: string;
    liters: number;
    buyerName?: string;
    worker?: string;
    couponCode?: string;
    calcType: string;
    createdAt: number;
}

const sessions = new Map<string, CheckoutSession>();
const TTL_MS = 10 * 60 * 1000;

export class CheckoutService {
    create(data: Omit<CheckoutSession, 'token' | 'createdAt'>) {
        const token = randomUUID();
        sessions.set(token, { ...data, token, createdAt: Date.now() });
        return token;
    }

    consume(token: string) {
        const s = sessions.get(token);
        if (!s) throw new Error('Sesja płatności nie istnieje');
        if (Date.now() - s.createdAt > TTL_MS) {
            sessions.delete(token);
            throw new Error('Sesja płatności wygasła');
        }
        sessions.delete(token);
        return s;
    }
}
