import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ message: 'Acceso denegado: se requiere rol ADMIN' });
    return;
  }
  next();
}

export function requireOperadorOrAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !['ADMIN', 'OPERADOR'].includes(req.user.role)) {
    res.status(403).json({ message: 'Acceso denegado' });
    return;
  }
  next();
}
