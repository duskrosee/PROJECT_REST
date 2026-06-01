import { prisma } from '../database';

export class AuditLogRepository {
  async findAll() {
    return await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 200
    });
  }

  async create(user: string, action: string, details: string) {
    return await prisma.auditLog.create({
      data: {
        user,
        action,
        details,
        timestamp: new Date()
      }
    });
  }
}
