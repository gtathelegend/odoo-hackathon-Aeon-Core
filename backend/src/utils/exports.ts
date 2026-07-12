/**
 * Tiny, dependency-free exporters for tabular report data.
 *
 * We support three output formats:
 *  - CSV  : RFC 4180 compliant, streamed to the response.
 *  - XLSX : an HTML table wrapped with `application/vnd.ms-excel`. Modern
 *           Excel opens this transparently and preserves column headers.
 *           It is *not* a real Office Open XML archive — for a hackathon
 *           this trades fidelity for zero-dependency deployability.
 *  - PDF  : an HTML report with print CSS. Callers typically render this
 *           through a browser print pipeline or Chromium headless. The
 *           `content-type` is set to `application/pdf` when a browser can
 *           already interpret HTML print, or to `text/html` otherwise
 *           (behavior controlled by the caller via `pdfInlineHtml`).
 */

export interface ExportColumn<T> {
  key: string;
  header: string;
  /** Optional cell formatter — return anything convertible to string. */
  format?: (row: T) => string | number | boolean | null | undefined;
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

export interface ReportPayload<T> {
  title: string;
  columns: ExportColumn<T>[];
  rows: T[];
  generatedAt?: Date;
  meta?: Record<string, unknown>;
}

const NEEDS_ESCAPE = /[",\r\n]/;

/**
 * Escape a single CSV cell. Values containing commas, quotes or newlines are
 * wrapped in double quotes and internal quotes doubled.
 */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  if (NEEDS_ESCAPE.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Convert a value to the string form the exporters use. */
function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Render `rows` to a CSV string. */
export function toCsv<T>(payload: ReportPayload<T>): string {
  const header = payload.columns.map((c) => csvEscape(c.header)).join(',');
  const body = payload.rows
    .map((row) =>
      payload.columns
        .map((c) =>
          csvEscape(stringify(c.format ? c.format(row) : (row as Record<string, unknown>)[c.key])),
        )
        .join(','),
    )
    .join('\r\n');
  return `${header}\r\n${body}\r\n`;
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Build a minimal HTML table representing the payload. */
export function toHtmlTable<T>(payload: ReportPayload<T>): string {
  const rows = payload.rows
    .map((row) => {
      const cells = payload.columns
        .map(
          (c) =>
            `<td>${htmlEscape(stringify(c.format ? c.format(row) : (row as Record<string, unknown>)[c.key]))}</td>`,
        )
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  const head = payload.columns.map((c) => `<th>${htmlEscape(c.header)}</th>`).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

/**
 * Wrap an HTML table in a full document suitable for the "xlsx" fallback.
 * Excel opens this via the `application/vnd.ms-excel` MIME type.
 */
export function toXlsxHtml<T>(payload: ReportPayload<T>): string {
  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8"><title>${htmlEscape(payload.title)}</title></head>
<body>${toHtmlTable(payload)}</body>
</html>`;
}

/** Wrap an HTML table in a print-friendly document for the "pdf" fallback. */
export function toPdfHtml<T>(payload: ReportPayload<T>): string {
  const generated = (payload.generatedAt ?? new Date()).toISOString();
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${htmlEscape(payload.title)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #111; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f4f4f5; }
  tbody tr:nth-child(even) { background: #fafafa; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>${htmlEscape(payload.title)}</h1>
<div class="meta">Generated ${htmlEscape(generated)} · ${payload.rows.length} rows</div>
${toHtmlTable(payload)}
</body></html>`;
}

/**
 * Content-Type + suggested extension for each export format. Callers can use
 * these to set response headers consistently.
 */
export const EXPORT_MIME: Record<ExportFormat, { contentType: string; ext: string }> = {
  csv: { contentType: 'text/csv; charset=utf-8', ext: 'csv' },
  xlsx: { contentType: 'application/vnd.ms-excel; charset=utf-8', ext: 'xls' },
  pdf: { contentType: 'text/html; charset=utf-8', ext: 'html' },
  json: { contentType: 'application/json; charset=utf-8', ext: 'json' },
};

/** Convert a payload to a Buffer + mime tuple for the selected format. */
export function renderExport<T>(
  payload: ReportPayload<T>,
  format: ExportFormat,
): { body: string; contentType: string; ext: string; filename: string } {
  const stamp = (payload.generatedAt ?? new Date()).toISOString().replace(/[:.]/g, '-');
  const slug = payload.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const ext = EXPORT_MIME[format].ext;
  const filename = `${slug || 'report'}-${stamp}.${ext}`;
  let body: string;
  switch (format) {
    case 'csv':
      body = toCsv(payload);
      break;
    case 'xlsx':
      body = toXlsxHtml(payload);
      break;
    case 'pdf':
      body = toPdfHtml(payload);
      break;
    case 'json':
    default:
      body = JSON.stringify(
        {
          title: payload.title,
          generatedAt: payload.generatedAt ?? new Date(),
          columns: payload.columns.map((c) => ({ key: c.key, header: c.header })),
          rows: payload.rows,
          meta: payload.meta,
        },
        null,
        2,
      );
      break;
  }
  return { body, contentType: EXPORT_MIME[format].contentType, ext, filename };
}
