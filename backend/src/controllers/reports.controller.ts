import type { Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess, sendNoContent } from '../utils/response';
import { AuthenticationError } from '../utils/errors';
import { reportsService } from '../services/reports.service';
import type {
  CreateSavedReportInput,
  UpdateSavedReportInput,
  SavedReportListQuery,
  RunReportInput,
  RunAndExportInput,
  ExportQuery,
} from '../validators/report';

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) throw new AuthenticationError('Authentication required');
  return req.user;
}

export const reportsController = {
  /**
   * GET /reports — list saved report configurations (own + shared).
   */
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const query = req.query as unknown as SavedReportListQuery;
    const result = await reportsService.listSaved(actor, query);
    sendSuccess(res, result.items, 'Reports fetched', 200, result.meta);
  }),

  /**
   * GET /reports/:id — get a single saved report by id.
   */
  getById: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const report = await reportsService.getSavedById(id, actor);
    sendSuccess(res, report, 'Report fetched');
  }),

  /**
   * POST /reports — save a new report configuration.
   */
  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const input = req.body as CreateSavedReportInput;
    const created = await reportsService.createSaved(input, actor);
    sendCreated(res, created, 'Report saved');
  }),

  /**
   * PUT /reports/:id — update a saved report.
   */
  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const input = req.body as UpdateSavedReportInput;
    const updated = await reportsService.updateSaved(id, input, actor);
    sendSuccess(res, updated, 'Report updated');
  }),

  /**
   * DELETE /reports/:id — soft-delete a saved report.
   */
  delete: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    await reportsService.deleteSaved(id, actor);
    sendNoContent(res);
  }),

  /**
   * POST /reports/run — run an ad-hoc report and return the dataset.
   */
  run: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const input = req.body as RunReportInput;
    const result = await reportsService.runReport(input, actor);
    sendSuccess(res, result, 'Report generated');
  }),

  /**
   * POST /reports/export — run and export a report in the specified format.
   */
  export: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const input = req.body as RunAndExportInput;
    const exported = await reportsService.runAndExport(input, actor);

    if (exported.contentType && exported.buffer) {
      res.setHeader('Content-Type', exported.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${exported.filename}"`,
      );
      res.send(exported.buffer);
      return;
    }
    sendSuccess(res, exported, 'Report exported');
  }),

  /**
   * GET /reports/:id/export?format=csv|xlsx|pdf|json — export a saved report.
   */
  exportSaved: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actor = requireUser(req);
    const { id } = req.params as { id: string };
    const query = req.query as unknown as ExportQuery;
    const exported = await reportsService.exportSaved(id, query.format, actor);

    if (exported.contentType && exported.buffer) {
      res.setHeader('Content-Type', exported.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${exported.filename}"`,
      );
      res.send(exported.buffer);
      return;
    }
    sendSuccess(res, exported, 'Report exported');
  }),

  /**
   * GET /reports/exports — list export history (recent exports).
   */
  listExports: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const query = req.query as { page?: string; limit?: string; savedReportId?: string };
    const result = await reportsService.listExports({
      page: Number(query.page) || undefined,
      limit: Number(query.limit) || undefined,
      savedReportId: query.savedReportId,
    });
    sendSuccess(res, result.items, 'Exports fetched', 200, result.meta);
  }),
};
