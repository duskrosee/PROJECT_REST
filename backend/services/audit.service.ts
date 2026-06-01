import { AuditLogRepository } from '../repositories/audit.repository';

export class AuditService {
  private auditRepo = new AuditLogRepository();

  async getLogs() {
    return await this.auditRepo.findAll();
  }
}
