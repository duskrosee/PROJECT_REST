import { randomUUID } from 'crypto';

export interface CheckoutSession {
    token: string;
    stationId: string;
    fuelId: string;
    liters: number;
    buyerName?: string;
    worker?: string;
    couponCode?: string;
    calcType: string;
    amountPLN?: number;
    createdAt: number;
}

const sessions = new Map<string, CheckoutSession>();
const TTL_MS = 10 * 60 * 1000;

export class CheckoutService {
    private pruneExpired() {
        const now = Date.now();
        for (const [token, session] of sessions) {
            if (now - session.createdAt > TTL_MS) {
                sessions.delete(token);
            }
        }
    }

    create(data: Omit<CheckoutSession, 'token' | 'createdAt'>) {
        this.pruneExpired();
        const token = randomUUID();
        sessions.set(token, { ...data, token, createdAt: Date.now() });
        return token;
    }

    getValidSession(token: string) {
        const s = sessions.get(token);
        if (!s) throw new Error('Sesja płatności nie istnieje');
        if (Date.now() - s.createdAt > TTL_MS) {
            sessions.delete(token);
            throw new Error('Sesja płatności wygasła');
        }
        return s;
    }

    complete(token: string) {
        sessions.delete(token);
    }
}
