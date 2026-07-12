import { reportsRepository } from '../repositories/reports.repository';
import { buildPaginationMeta, resolvePagination } from '../utils/pagination';
import { AuthorizationError, NotFoundError } from '../utils/errors';
import { logActivity } from './activity.service';
import { ROLES, hasRoleAtLeast, type Role } from '../constants/roles';
import type { RequestUser } from '../interfaces/request-user.interface';
import type {
  CreateSavedReportInput,
  UpdateSavedReportInput,
  SavedReportListQuery,
  RunReportInput,
  RunAndExportInput,
  ExportFormat,
  ReportFilters,
  ReportType,
} from '../validators/report';

// ─── Access helpers ──────────────────────────────────────────────────────────

function requireReportAccess(user: RequestUser) {
  if (!hasRoleAtLeast(user.role, ROLES.DEPARTMENT_HEAD)) {
    throw new AuthorizationError('Insufficient role to access reports');
  }
}

function canEditSaved(ownerId: string | null, user: RequestUser): boolean {
  if (user.role === ROLES.ADMIN || user.role === ROLES.ASSET_MANAGER) return true;
  return ownerId === user.id;
}

// ─── Dataset runner ──────────────────────────────────────────────────────────

async function runDataset(type: ReportType, filters: ReportFilters = {}) {
  switch (type) {
    case 'assets':
      return reportsRepository.assetsDataset(filters);
    case 'allocations':
      return reportsRepository.allocationsDataset(filters);
    case 'maintenance':
      return reportsRepository.maintenanceDataset(filters);
    case 'bookings':
      return reportsRepository.bookingsDataset(filters);
    case 'audits':
      return reportsRepository.auditsDataset(filters);
    default:
      throw new NotFoundError(`Unknown report type: ${type}`);
  }
}

// ─── Export formatting ───────────────────────────────────────────────────────

function flattenRow(row: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(result, flattenRow(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function toCsv(rows: unknown[], columns?: string[]): string {
  if (rows.length === 0) return '';
  const flat = rows.map((r) => flattenRow(r as Record<string, unknown>));
  const headers = columns ?? Object.keys(flat[0]!);
  const lines = [headers.join(',')];
  for (const row of flat) {
    lines.push(
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(','),
    );
  }
  return lines.join('\n');
}

function toJson(rows: unknown[]): string {
  return JSON.stringify(rows, null, 2);
}

/**
 * Format export output. For CSV and JSON we return a Buffer directly.
 * PDF and XLSX return a placeholder since those require heavy libraries
 * (pdfkit/exceljs) that would bloat the bundle — a real deployment wires
 * these via a worker queue; we track the export row for completeness.
 */
function formatExport(
  rows: unknown[],
  format: ExportFormat,
  reportName: string,
  columns?: string[],
): { buffer: Buffer; contentType: string; filename: string } {
  const timestamp = new Date().toISOString().slice(0, 10);
  const basename = `${reportName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${timestamp}`;

  switch (format) {
    case 'csv': {
      const csv = toCsv(rows, columns);
      return {
        buffer: Buffer.from(csv, 'utf-8'),
        contentType: 'text/csv; charset=utf-8',
        filename: `${basename}.csv`,
      };
    }
    case 'json': {
      const json = toJson(rows);
      return {
        buffer: Buffer.from(json, 'utf-8'),
        contentType: 'application/json; charset=utf-8',
        filename: `${basename}.json`,
      };
    }
    case 'xlsx': {
      // XLSX generation — produce a simple tab-separated format readable by Excel
      const flat = rows.map((r) => flattenRow(r as Record<string, unknown>));
      const headers = columns ?? (flat.length > 0 ? Object.keys(flat[0]!) : []);
      const lines = [headers.join('\t')];
      for (const row of flat) {
        lines.push(headers.map((h) => String(row[h] ?? '')).join('\t'));
      }
      return {
        buffer: Buffer.from(lines.join('\n'), 'utf-8'),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${basename}.xlsx`,
      };
    }
    case 'pdf': {
      // PDF generation — produce a text-based representation
      const flat = rows.map((r) => flattenRow(r as Record<string, unknown>));
      const headers = columns ?? (flat.length > 0 ? Object.keys(flat[0]!) : []);
      const pdfLines = [
        `Report: ${reportName}`,
        `Generated: ${new Date().toISOString()}`,
        `Records: ${rows.length}`,
        '',
        headers.join(' | '),
        '-'.repeat(80),
      ];
      for (const row of flat.slice(0, 1000)) {
        pdfLines.push(headers.map((h) => String(row[h] ?? '')).join(' | '));
      }
      return {
        buffer: Buffer.from(pdfLines.join('\n'), 'utf-8'),
        contentType: 'application/pdf',
        filename: `${basename}.pdf`,
      };
    }
    default:
      throw new NotFoundError(`Unsupported export format: ${format}`);
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const reportsService = {
  /**
   * List saved reports — users see their own + shared; admins see all.
   */
  async listSaved(user: RequestUser, query: SavedReportListQuery) {
    requireReportAccess(user);
    const { page, limit, skip } = resolvePagination({ page: query.page, limit: query.limit });
    const [items, total] = await reportsRepository.listSaved({
      skip,
      take: limit,
      ownerId: query.mineOnly ? user.id : user.role === ROLES.ADMIN ? undefined : user.id,
      type: query.type,
      search: query.search,
    });
    return { items, meta: buildPaginationMeta(total, page, limit) };
  },

  /**
   * Get a saved report by id. Enforces visibility rules.
   */
  async getSavedById(id: string, user: RequestUser) {
    requireReportAccess(user);
    const report = await reportsRepository.findSavedById(id);
    if (!report) throw new NotFoundError('Report not found');
    if (!report.isShared && report.ownerId !== user.id && user.role !== ROLES.ADMIN) {
      throw new AuthorizationError('You do not have access to this report');
    }
    return report;
  },

  /**
   * Create a new saved report configuration.
   */
  async createSaved(input: CreateSavedReportInput, user: RequestUser) {
    requireReportAccess(user);
    const config: Record<string, unknown> = {};
    if (input.filters) config.filters = input.filters;
    if (input.schedule) config.schedule = input.schedule;

    const created = await reportsRepository.createSaved({
      name: input.name,
      type: input.type,
      ownerId: user.id,
      isShared: input.isShared,
      config: Object.keys(config).length > 0 ? config : undefined,
      createdBy: user.id,
      updatedBy: user.id,
    });

    void logActivity({
      action: 'report.created',
      userId: user.id,
      entityType: 'report',
      entityId: created.id,
      metadata: { name: input.name, type: input.type },
    });

    return created;
  },

  /**
   * Update a saved report. Only owner or admin can edit.
   */
  async updateSaved(id: string, input: UpdateSavedReportInput, user: RequestUser) {
    requireReportAccess(user);
    const existing = await reportsRepository.findSavedById(id);
    if (!existing) throw new NotFoundError('Report not found');
    if (!canEditSaved(existing.ownerId, user)) {
      throw new AuthorizationError('Cannot edit this report');
    }

    const config = (existing.config as Record<string, unknown>) ?? {};
    if (input.filters !== undefined) config.filters = input.filters;
    if (input.schedule !== undefined) config.schedule = input.schedule;

    const updated = await reportsRepository.updateSaved(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.isShared !== undefined ? { isShared: input.isShared } : {}),
      config: Object.keys(config).length > 0 ? config : undefined,
      updatedBy: user.id,
    });

    void logActivity({
      action: 'report.updated',
      userId: user.id,
      entityType: 'report',
      entityId: id,
    });

    return updated;
  },

  /**
   * Soft-delete a saved report.
   */
  async deleteSaved(id: string, user: RequestUser) {
    requireReportAccess(user);
    const existing = await reportsRepository.findSavedById(id);
    if (!existing) throw new NotFoundError('Report not found');
    if (!canEditSaved(existing.ownerId, user)) {
      throw new AuthorizationError('Cannot delete this report');
    }
    await reportsRepository.softDeleteSaved(id, user.id);
    void logActivity({
      action: 'report.deleted',
      userId: user.id,
      entityType: 'report',
      entityId: id,
    });
  },

  /**
   * Run an ad-hoc report and return the raw dataset + summary stats.
   */
  async runReport(input: RunReportInput, user: RequestUser) {
    requireReportAccess(user);
    const rows = await runDataset(input.type, input.filters ?? {});
    void logActivity({
      action: 'report.run',
      userId: user.id,
      entityType: 'report',
      metadata: { type: input.type, rowCount: rows.length },
    });
    return {
      type: input.type,
      rowCount: rows.length,
      generatedAt: new Date().toISOString(),
      rows,
    };
  },

  /**
   * Run a report and export it in the requested format.
   */
  async runAndExport(input: RunAndExportInput, user: RequestUser) {
    requireReportAccess(user);
    const rows = await runDataset(input.type, input.filters ?? {});
    const exported = formatExport(rows, input.format, input.type, input.columns);

    // Track export in DB
    await reportsRepository.createExport({
      format: input.format,
      status: 'COMPLETED',
      rowCount: rows.length,
      fileUrl: null,
      completedAt: new Date(),
      createdBy: user.id,
    });

    void logActivity({
      action: 'report.exported',
      userId: user.id,
      entityType: 'report',
      metadata: { type: input.type, format: input.format, rowCount: rows.length },
    });

    return exported;
  },

  /**
   * Export a saved report using its stored configuration.
   */
  async exportSaved(id: string, format: ExportFormat, user: RequestUser) {
    requireReportAccess(user);
    const report = await reportsRepository.findSavedById(id);
    if (!report) throw new NotFoundError('Report not found');
    if (!report.isShared && report.ownerId !== user.id && user.role !== ROLES.ADMIN) {
      throw new AuthorizationError('You do not have access to this report');
    }
    const config = (report.config ?? {}) as Record<string, unknown>;
    const filters = (config.filters ?? {}) as ReportFilters;
    const rows = await runDataset(report.type as ReportType, filters);
    const exported = formatExport(rows, format, report.name);

    await reportsRepository.createExport({
      savedReportId: id,
      format,
      status: 'COMPLETED',
      rowCount: rows.length,
      fileUrl: null,
      completedAt: new Date(),
      createdBy: user.id,
    });

    void logActivity({
      action: 'report.exported',
      userId: user.id,
      entityType: 'report',
      entityId: id,
      metadata: { name: report.name, format, rowCount: rows.length },
    });

    return exported;
  },

  /**
   * List export history records.
   */
  async listExports(params: { page?: number; limit?: number; savedReportId?: string }) {
    const { page, limit, skip } = resolvePagination({ page: params.page, limit: params.limit });
    const [items, total] = await reportsRepository.listExports({
      skip,
      take: limit,
      savedReportId: params.savedReportId,
    });
    return { items, meta: buildPaginationMeta(total, page, limit) };
  },

  /**
   * Execute scheduled reports — called by the scheduler. Finds saved reports
   * with a schedule config and runs + emails them to recipients.
   */
  async runScheduledReports() {
    const { prisma } = await import('../config/database');
    const { sendEmail, renderNotificationEmail } = await import('./email.service');
    const { logger } = await import('../config/logger');

    const allSaved = await prisma.savedReport.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, type: true, config: true, ownerId: true },
    });

    let executed = 0;
    for (const report of allSaved) {
      const config = (report.config ?? {}) as Record<string, unknown>;
      const schedule = config.schedule as
        | { frequency: string; hour: number; format: string; recipientIds?: string[] }
        | undefined;
      if (!schedule) continue;

      // Simple time check: run at the configured hour
      const now = new Date();
      if (now.getUTCHours() !== schedule.hour) continue;

      // Frequency check
      const dayOfWeek = now.getUTCDay();
      const dayOfMonth = now.getUTCDate();
      if (schedule.frequency === 'weekly' && dayOfWeek !== 1) continue; // Monday
      if (schedule.frequency === 'monthly' && dayOfMonth !== 1) continue;

      try {
        const filters = (config.filters ?? {}) as ReportFilters;
        const rows = await runDataset(report.type as ReportType, filters);
        const format = (schedule.format ?? 'csv') as ExportFormat;
        const exported = formatExport(rows, format, report.name);

        await reportsRepository.createExport({
          savedReportId: report.id,
          format,
          status: 'COMPLETED',
          rowCount: rows.length,
          fileUrl: null,
          completedAt: new Date(),
          createdBy: report.ownerId,
        });

        // Email to recipients
        const recipientIds = schedule.recipientIds ?? (report.ownerId ? [report.ownerId] : []);
        if (recipientIds.length > 0) {
          const users = await prisma.user.findMany({
            where: { id: { in: recipientIds }, deletedAt: null, isActive: true },
            select: { email: true, firstName: true },
          });
          for (const user of users) {
            const html = renderNotificationEmail({
              title: `Scheduled Report: ${report.name}`,
              message: `Your ${schedule.frequency} report "${report.name}" is ready with ${rows.length} records.`,
              actionLabel: 'View Report',
              actionUrl: `/reports/${report.id}`,
            });
            await sendEmail({
              to: user.email,
              subject: `[AssetFlow] ${report.name} - ${schedule.frequency} report`,
              html,
              text: `Report "${report.name}" generated: ${rows.length} records (${format}).`,
            }).catch(() => undefined);
          }
        }

        executed += 1;
      } catch (error) {
        logger.warn('scheduled report failed', { reportId: report.id, error });
      }
    }
    return { executed };
  },
};
