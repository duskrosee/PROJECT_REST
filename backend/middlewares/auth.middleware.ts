import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'FUEL_STATION_MGMT_SECRET_KEY_2026';

export interface JwtUser {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtUser;
}

function verifyToken(req: AuthenticatedRequest, res: Response): JwtUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Nieautoryzowany: Brak tokenu JWT w nagłówku Authorization' });
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUser;
    req.user = decoded;
    return decoded;
  } catch {
    res.status(401).json({ error: 'Nieautoryzowany: Nieprawidłowy lub przedawniony token JWT' });
    return null;
  }
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (verifyToken(req, res)) {
    next();
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = verifyToken(req, res);
  if (!user) {
    return;
  }

  if (!user.isAdmin) {
    res.status(403).json({ error: 'Brak uprawnień: Wymagane konto administratora' });
    return;
  }

  next();
};
