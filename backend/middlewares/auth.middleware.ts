import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'FUEL_STATION_MGMT_SECRET_KEY_2026';

export const authorizeJwt = (requiredRoles?: ('admin' | 'manager' | 'operator')[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
       res.status(401).json({ error: 'Nieautoryzowany: Brak tokenu JWT w nagłówku Authorization' });
       return;
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        username: string;
        email: string;
        role: 'admin' | 'manager' | 'operator';
      };

      req.user = decoded;

      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(decoded.role)) {
           res.status(403).json({
            error: `Brak uprawnień: Wymagana rola jedna z [${requiredRoles.join(', ')}], Twoja rola: ${decoded.role}`
          });
           return;
        }
      }

      next();
    } catch (err) {
       res.status(401).json({ error: 'Nieautoryzowany: Nieprawidłowy lub przedawniony token JWT' });
       return;
    }
  };
};
