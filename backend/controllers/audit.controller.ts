import { Request, Response } from 'express';
import { AuditService } from '../services/audit.service';

const auditService = new AuditService();

export class AuditLogController {
  async getLogs(req: Request, res: Response) {
    try {
      const logs = await auditService.getLogs();
       res.status(200).json(logs);
    } catch (err: any) {
       res.status(500).json({ error: err.message });
    }
  }
}
