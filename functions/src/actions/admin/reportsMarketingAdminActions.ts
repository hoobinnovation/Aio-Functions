import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { normalizeTableQuery, pickColumns } from './reporting/tableQuery';

type MarketingFilters = {
  channel?: 'app' | 'web' | 'branch' | 'POS';
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  platform?: 'facebook' | 'instagram' | 'whatsapp' | 'google' | 'other';
  branchId?: string;
  deviceId?: string;
};

function ensureSupportedFilters(filters: MarketingFilters) {
  if (filters.platform || filters.branchId || filters.deviceId) {
    throw new AppError('VALIDATION_FAILED', 'Requested filter is not supported by current attribution dataset', {
      unsupported: {
        platform: Boolean(filters.platform),
        branchId: Boolean(filters.branchId),
        deviceId: Boolean(filters.deviceId),
      },
    });
  }
}

function parseGroupBy(groupBy: string[] | null | undefined): { keySql: string; keyLabel: string } {
  if (!groupBy || groupBy.length === 0) return { keySql: "COALESCE(ma.campaign,'(none)')", keyLabel: 'campaign' };
  if (groupBy.length > 1) throw new AppError('VALIDATION_FAILED', 'Only one groupBy field is supported for marketing reports in this phase');
  const field = groupBy[0];
  const map: Record<string, string> = {
    day: 'DATE(o.createdAt)',
    week: "DATE_FORMAT(o.createdAt, '%x-W%v')",
    month: "DATE_FORMAT(o.createdAt, '%Y-%m')",
    channel: 'o.channel',
    source: 'ma.source',
    medium: 'ma.medium',
    campaign: 'ma.campaign',
  };
  const keySql = map[field];
  if (!keySql) throw new AppError('VALIDATION_FAILED', `Unsupported groupBy field: ${field}`);
  return { keySql: `COALESCE(${keySql}, '(none)')`, keyLabel: field };
}

function buildWhere(filters: MarketingFilters) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.channel) { where.push('o.channel = ?'); params.push(filters.channel); }
  if (filters.source) { where.push('ma.source = ?'); params.push(filters.source); }
  if (filters.medium) { where.push('ma.medium = ?'); params.push(filters.medium); }
  if (filters.campaign) { where.push('ma.campaign = ?'); params.push(filters.campaign); }
  if (filters.term) { where.push('ma.term = ?'); params.push(filters.term); }
  if (filters.content) { where.push('ma.content = ?'); params.push(filters.content); }
  return { where, params };
}

export async function adminReportsAttributionOverview(ctx: ActionContext, payload: any) {
  const q = normalizeTableQuery(payload, { sortBy: 'revenueCents', sortDir: 'desc', pageSize: 50 });
  const filters = (q.filters ?? {}) as MarketingFilters;
  ensureSupportedFilters(filters);

  const { keySql, keyLabel } = parseGroupBy(q.groupBy);
  const { where, params } = buildWhere(filters);
  const whereSql = where.length ? ` AND ${where.join(' AND ')}` : '';
  const sortMap: Record<string, string> = { ordersCount: 'ordersCount', revenueCents: 'revenueCents', avgOrderValueCents: 'avgOrderValueCents', key: 'key' };
  const sortExpr = sortMap[q.sort.by] ?? sortMap.revenueCents;

  const totalRows = await ctx.db.query(
    `SELECT COUNT(*) total FROM (
      SELECT ${keySql} as gk
      FROM orders o
      JOIN (
        SELECT x.uid, e.source, e.medium, e.campaign, e.term, e.content
        FROM (
          SELECT uid, MAX(createdAt) maxCreatedAt
          FROM marketing_attribution_events
          WHERE storeId = ? AND createdAt BETWEEN ? AND ?
          GROUP BY uid
        ) x
        JOIN marketing_attribution_events e ON e.uid = x.uid AND e.createdAt = x.maxCreatedAt
      ) ma ON ma.uid = o.uid
      WHERE o.storeId = ? AND o.createdAt BETWEEN ? AND ? ${whereSql}
      GROUP BY gk
    ) z`,
    [q.storeId, q.range.from, q.range.to, q.storeId, q.range.from, q.range.to, ...params],
  );
  const total = Number(totalRows[0]?.total ?? 0);
  if (q.fetchAll && total > 10000) throw new AppError('FETCH_ALL_LIMIT_EXCEEDED', 'Fetch all limit exceeded', { limit: 10000, total });
  const limit = q.fetchAll ? 10000 : q.pageSize;
  const offset = q.fetchAll ? 0 : (q.page - 1) * q.pageSize;

  const items = await ctx.db.query(
    `SELECT ${keySql} as \`key\`,
            COUNT(*) as ordersCount,
            COALESCE(SUM(o.totalCents),0) as revenueCents,
            COALESCE(AVG(o.totalCents),0) as avgOrderValueCents
     FROM orders o
     JOIN (
       SELECT x.uid, e.source, e.medium, e.campaign, e.term, e.content
       FROM (
         SELECT uid, MAX(createdAt) maxCreatedAt
         FROM marketing_attribution_events
         WHERE storeId = ? AND createdAt BETWEEN ? AND ?
         GROUP BY uid
       ) x
       JOIN marketing_attribution_events e ON e.uid = x.uid AND e.createdAt = x.maxCreatedAt
     ) ma ON ma.uid = o.uid
     WHERE o.storeId = ? AND o.createdAt BETWEEN ? AND ? ${whereSql}
     GROUP BY \`key\`
     ORDER BY ${sortExpr} ${q.sort.dir === 'asc' ? 'ASC' : 'DESC'}
     LIMIT ? OFFSET ?`,
    [q.storeId, q.range.from, q.range.to, q.storeId, q.range.from, q.range.to, ...params, limit, offset],
  );

  const aggregateRows = await ctx.db.query(
    `SELECT COUNT(*) attributedOrdersCount,
            COALESCE(SUM(o.totalCents),0) attributedRevenueCents
     FROM orders o
     JOIN (
       SELECT x.uid, e.source, e.medium, e.campaign, e.term, e.content
       FROM (
         SELECT uid, MAX(createdAt) maxCreatedAt
         FROM marketing_attribution_events
         WHERE storeId = ? AND createdAt BETWEEN ? AND ?
         GROUP BY uid
       ) x
       JOIN marketing_attribution_events e ON e.uid = x.uid AND e.createdAt = x.maxCreatedAt
     ) ma ON ma.uid = o.uid
     WHERE o.storeId = ? AND o.createdAt BETWEEN ? AND ? ${whereSql}`,
    [q.storeId, q.range.from, q.range.to, q.storeId, q.range.from, q.range.to, ...params],
  );

  const sessionRows = await ctx.db.query(
    `SELECT COUNT(*) sessionsCount FROM marketing_attribution_events WHERE storeId=? AND createdAt BETWEEN ? AND ?`,
    [q.storeId, q.range.from, q.range.to],
  );
  const attributedOrdersCount = Number(aggregateRows[0]?.attributedOrdersCount ?? 0);
  const sessionsCount = Number(sessionRows[0]?.sessionsCount ?? 0);
  const topChannelsRows = await ctx.db.query(
    `SELECT o.channel channel, COUNT(*) c
     FROM orders o
     JOIN (SELECT uid, MAX(createdAt) maxCreatedAt FROM marketing_attribution_events WHERE storeId=? AND createdAt BETWEEN ? AND ? GROUP BY uid) ma ON ma.uid=o.uid
     WHERE o.storeId=? AND o.createdAt BETWEEN ? AND ?
     GROUP BY o.channel ORDER BY c DESC LIMIT 5`,
    [q.storeId, q.range.from, q.range.to, q.storeId, q.range.from, q.range.to],
  );

  const includeRoas = Boolean(payload.flags?.includeRoas);
  const includeMargin = Boolean(payload.flags?.includeMargin);
  const aggregates: Record<string, unknown> = {
    attributedOrdersCount,
    attributedRevenueCents: Number(aggregateRows[0]?.attributedRevenueCents ?? 0),
    conversionRate: sessionsCount > 0 ? attributedOrdersCount / sessionsCount : null,
    topChannels: topChannelsRows.map((r: any) => ({ channel: r.channel, count: Number(r.c) })),
    roasAvailable: false,
    marginAvailable: false,
  };
  if (includeRoas) aggregates.roas = null;
  if (includeMargin) aggregates.contributionCents = null;

  return {
    items: pickColumns(items, ['key', 'ordersCount', 'revenueCents', 'avgOrderValueCents'], q.columns),
    pageInfo: { page: q.fetchAll ? 1 : q.page, pageSize: q.fetchAll ? total : q.pageSize, total },
    grouped: { by: [keyLabel], groups: items.map((r: any) => ({ key: r.key, count: Number(r.ordersCount) })) },
    aggregates,
    capabilities: { canEdit: false, canDelete: false },
  };
}

export async function adminReportsTopCampaigns(ctx: ActionContext, payload: any) {
  const q = normalizeTableQuery(payload, { sortBy: 'revenueCents', sortDir: 'desc', pageSize: 50 });
  const filters = (q.filters ?? {}) as MarketingFilters;
  ensureSupportedFilters(filters);
  const { where, params } = buildWhere(filters);
  const whereSql = where.length ? ` AND ${where.join(' AND ')}` : '';
  const sortMap: Record<string, string> = { ordersCount: 'ordersCount', revenueCents: 'revenueCents', campaign: 'campaign' };
  const sortExpr = sortMap[q.sort.by] ?? sortMap.revenueCents;

  const totalRows = await ctx.db.query(
    `SELECT COUNT(*) total FROM (
      SELECT COALESCE(ma.campaign,'(none)') campaign, COALESCE(ma.source,'(none)') source, COALESCE(ma.medium,'(none)') medium
      FROM orders o
      JOIN (
        SELECT x.uid, e.source, e.medium, e.campaign, e.term, e.content
        FROM (
          SELECT uid, MAX(createdAt) maxCreatedAt
          FROM marketing_attribution_events
          WHERE storeId = ? AND createdAt BETWEEN ? AND ?
          GROUP BY uid
        ) x
        JOIN marketing_attribution_events e ON e.uid = x.uid AND e.createdAt = x.maxCreatedAt
      ) ma ON ma.uid = o.uid
      WHERE o.storeId = ? AND o.createdAt BETWEEN ? AND ? ${whereSql}
      GROUP BY campaign, source, medium
    ) z`,
    [q.storeId, q.range.from, q.range.to, q.storeId, q.range.from, q.range.to, ...params],
  );
  const total = Number(totalRows[0]?.total ?? 0);
  if (q.fetchAll && total > 10000) throw new AppError('FETCH_ALL_LIMIT_EXCEEDED', 'Fetch all limit exceeded', { limit: 10000, total });
  const limit = q.fetchAll ? 10000 : q.pageSize;
  const offset = q.fetchAll ? 0 : (q.page - 1) * q.pageSize;

  const items = await ctx.db.query(
    `SELECT COALESCE(ma.campaign,'(none)') campaign,
            COALESCE(ma.source,'(none)') source,
            COALESCE(ma.medium,'(none)') medium,
            COUNT(*) ordersCount,
            COALESCE(SUM(o.totalCents),0) revenueCents,
            NULL roas,
            NULL contributionCents
     FROM orders o
     JOIN (
       SELECT x.uid, e.source, e.medium, e.campaign, e.term, e.content
       FROM (
         SELECT uid, MAX(createdAt) maxCreatedAt
         FROM marketing_attribution_events
         WHERE storeId = ? AND createdAt BETWEEN ? AND ?
         GROUP BY uid
       ) x
       JOIN marketing_attribution_events e ON e.uid = x.uid AND e.createdAt = x.maxCreatedAt
     ) ma ON ma.uid = o.uid
     WHERE o.storeId = ? AND o.createdAt BETWEEN ? AND ? ${whereSql}
     GROUP BY campaign, source, medium
     ORDER BY ${sortExpr} ${q.sort.dir === 'asc' ? 'ASC' : 'DESC'}
     LIMIT ? OFFSET ?`,
    [q.storeId, q.range.from, q.range.to, q.storeId, q.range.from, q.range.to, ...params, limit, offset],
  );

  const aggregatesRows = await ctx.db.query(
    `SELECT COUNT(*) attributedOrdersCount, COALESCE(SUM(o.totalCents),0) attributedRevenueCents
     FROM orders o
     JOIN (
       SELECT x.uid, e.source, e.medium, e.campaign, e.term, e.content
       FROM (
         SELECT uid, MAX(createdAt) maxCreatedAt
         FROM marketing_attribution_events
         WHERE storeId = ? AND createdAt BETWEEN ? AND ?
         GROUP BY uid
       ) x
       JOIN marketing_attribution_events e ON e.uid = x.uid AND e.createdAt = x.maxCreatedAt
     ) ma ON ma.uid = o.uid
     WHERE o.storeId = ? AND o.createdAt BETWEEN ? AND ? ${whereSql}`,
    [q.storeId, q.range.from, q.range.to, q.storeId, q.range.from, q.range.to, ...params],
  );

  return {
    items: pickColumns(items, ['campaign', 'source', 'medium', 'ordersCount', 'revenueCents', 'roas', 'contributionCents'], q.columns),
    pageInfo: { page: q.fetchAll ? 1 : q.page, pageSize: q.fetchAll ? total : q.pageSize, total },
    aggregates: { ...aggregatesRows[0], roasAvailable: false, marginAvailable: false },
    capabilities: { canEdit: false, canDelete: false },
  };
}
