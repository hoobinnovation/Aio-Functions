import { ActionContext } from '../../core/protocol';
import { normalizeTableQuery, applyPaginationOrFetchAll, applySort, applyGroupBySummary, pickColumns, serializeReportRows } from './reporting/tableQuery';
import { Order } from '../../entities/Order';
import { AppError } from '../../core/errors';
import { buildCanonicalOrderStatusSql, buildOperationalOrderWhereSql } from '../../core/orderStatus';

function capabilities() {return { canEdit: false, canDelete: false }; }

export async function reportsOverview(ctx: ActionContext, payload: any) {
  const q = normalizeTableQuery(
      payload,
      { sortBy: 'date', sortDir: 'desc', pageSize: 50 },
      { fallbackStoreId: ctx.storeId },
  );
  const canonicalStatusSql = buildCanonicalOrderStatusSql('o');
  const operationalOrderWhereSql = buildOperationalOrderWhereSql('o');

  const aggregatesRows = await ctx.db.query(
      `SELECT
         COUNT(*) AS ordersCount,
         COALESCE(SUM(o.subtotalCents),0) AS grossRevenueCents,
         COALESCE(SUM(o.discountCents),0) AS discountsCents,
         COALESCE(SUM(o.totalCents),0) AS netRevenueCents,
         COALESCE(AVG(o.totalCents),0) AS avgOrderValueCents,
         COUNT(DISTINCT CASE WHEN x.cnt = 1 THEN o.uid END) AS newCustomersCount,
         COUNT(DISTINCT CASE WHEN x.cnt > 1 THEN o.uid END) AS returningCustomersCount
       FROM orders o
              JOIN (
         SELECT uid, COUNT(*) AS cnt
         FROM orders ord
         WHERE ord.storeId = ? AND ord.createdAt BETWEEN ? AND ? AND ${buildOperationalOrderWhereSql('ord')}
         GROUP BY uid
       ) x ON x.uid = o.uid
       WHERE o.storeId = ? AND o.createdAt BETWEEN ? AND ? AND ${operationalOrderWhereSql}`,
      [q.storeId, q.range.from, q.range.to, q.storeId, q.range.from, q.range.to],
  );

  const qb = ctx.db
      .getRepository(Order)
      .createQueryBuilder('o')
      .select('DATE(o.createdAt)', 'date')
      .addSelect('COUNT(*)', 'ordersCount')
      .addSelect('COALESCE(SUM(o.totalCents),0)', 'netRevenueCents')
      .where('o.storeId=:storeId AND o.createdAt BETWEEN :from AND :to', {
        storeId: q.storeId,
        from: q.range.from,
        to: q.range.to,
      })
      .andWhere(operationalOrderWhereSql)
      .groupBy('DATE(o.createdAt)');

  applySort(
      qb as any,
      q,
      {
        date: 'DATE(o.createdAt)',
        netRevenueCents: 'netRevenueCents',
        ordersCount: 'ordersCount',
      },
      { by: 'date', dir: 'desc' },
  );

  const pageInfo = await applyPaginationOrFetchAll(qb as any, q);
  const items = await qb.getRawMany();

  const grouped = await applyGroupBySummary(
      ctx.db
          .getRepository(Order)
          .createQueryBuilder('o')
          .where('o.storeId=:storeId AND o.createdAt BETWEEN :from AND :to', {
            storeId: q.storeId,
            from: q.range.from,
            to: q.range.to,
          })
          .andWhere(operationalOrderWhereSql),
      q,
      { day: 'DATE(o.createdAt)', channel: 'o.channel', status: canonicalStatusSql },
  );

  const professional = payload.flags?.includeProfessional
      ? await (async () => {
        const refunds = await ctx.db.query(
            `SELECT COALESCE(SUM(ref.amountCents),0) AS refundsCents
             FROM refunds ref
                    JOIN returns r ON r.id = ref.returnId
             WHERE r.storeId = ? AND ref.createdAt BETWEEN ? AND ?`,
            [q.storeId, q.range.from, q.range.to],
        );

        const cashback = await ctx.db.query(
            `SELECT COALESCE(SUM(CASE WHEN wt.type='cashback_issue' THEN wt.amountCents ELSE 0 END),0) AS cashbackCents
             FROM wallet_transactions wt
                    JOIN orders o ON o.uid = wt.uid AND o.storeId = ?
             WHERE wt.createdAt BETWEEN ? AND ?`,
            [q.storeId, q.range.from, q.range.to],
        );

        const shippingFeesCents = await ctx.db.query(
            `SELECT COALESCE(SUM(shippingCents),0) AS shippingFeesCents
           FROM orders ord
           WHERE ord.storeId = ? AND ord.createdAt BETWEEN ? AND ? AND ${buildOperationalOrderWhereSql('ord')}`,
            [q.storeId, q.range.from, q.range.to],
        );

        const discountsCents = Number(aggregatesRows[0]?.discountsCents ?? 0);
        const netRevenue = Number(aggregatesRows[0]?.netRevenueCents ?? 0);
        const refundsCents = Number(refunds[0]?.refundsCents ?? 0);
        const cashbackCents = Number(cashback[0]?.cashbackCents ?? 0);
        const shippingCents = Number(shippingFeesCents[0]?.shippingFeesCents ?? 0);

        return {
          contributionCents: netRevenue - refundsCents - cashbackCents,
          refundsCents,
          shippingFeesCents: shippingCents,
          cashbackCents,
          discountsCents,
          cogsCents: null,
          cogsAvailable: false,
        };
      })()
      : null;

  return {
    items: pickColumns(
        serializeReportRows(items),
        ['date', 'ordersCount', 'netRevenueCents'],
        q.columns,
    ),
    pageInfo,
    grouped,
    aggregates: {
      ...aggregatesRows[0],
      ...(professional ?? {}),
    },
    capabilities: capabilities(),
  };
}

export async function reportsOrdersByStatus(ctx: ActionContext, payload: any) {
  const q = normalizeTableQuery(payload, { sortBy: 'ordersCount', sortDir: 'desc', pageSize: 50 }, { fallbackStoreId: ctx.storeId });
  const canonicalStatusSql = buildCanonicalOrderStatusSql('o');
  const qb = ctx.db.getRepository(Order).createQueryBuilder('o')
    .select(canonicalStatusSql, 'status')
    .addSelect('COUNT(*)', 'ordersCount')
    .addSelect('COALESCE(SUM(o.subtotalCents),0)', 'grossRevenueCents')
    .addSelect('COALESCE(SUM(o.totalCents),0)', 'netRevenueCents')
    .addSelect('COALESCE(AVG(o.totalCents),0)', 'avgOrderValueCents')
    .where('o.storeId=:storeId AND o.createdAt BETWEEN :from AND :to', { storeId: q.storeId, from: q.range.from, to: q.range.to })
    .andWhere(buildOperationalOrderWhereSql('o'))
    .groupBy(canonicalStatusSql);
  applySort(qb as any, q, { ordersCount: 'ordersCount', netRevenueCents: 'netRevenueCents', status: canonicalStatusSql }, { by: 'ordersCount', dir: 'desc' });
  const pageInfo = await applyPaginationOrFetchAll(qb as any, q);
  const items = await qb.getRawMany();

  const grouped = await applyGroupBySummary(
    ctx.db.getRepository(Order).createQueryBuilder('o')
      .where('o.storeId=:storeId AND o.createdAt BETWEEN :from AND :to', { storeId: q.storeId, from: q.range.from, to: q.range.to })
      .andWhere(buildOperationalOrderWhereSql('o')),
    q,
    { status: canonicalStatusSql, day: 'DATE(o.createdAt)', channel: 'o.channel', branchId: "'N/A'" }
  );
  const aggregates: Record<string, unknown> = {};
  if (payload.flags?.includeAging) {
    const aging = await ctx.db.query(
      `SELECT
         SUM(CASE WHEN TIMESTAMPDIFF(HOUR, createdAt, NOW()) < 24 THEN 1 ELSE 0 END) as a0,
         SUM(CASE WHEN TIMESTAMPDIFF(HOUR, createdAt, NOW()) >= 24 AND TIMESTAMPDIFF(HOUR, createdAt, NOW()) < 48 THEN 1 ELSE 0 END) as a1,
         SUM(CASE WHEN TIMESTAMPDIFF(HOUR, createdAt, NOW()) >= 48 AND TIMESTAMPDIFF(HOUR, createdAt, NOW()) < 72 THEN 1 ELSE 0 END) as a2,
         SUM(CASE WHEN TIMESTAMPDIFF(HOUR, createdAt, NOW()) >= 72 THEN 1 ELSE 0 END) as a3
       FROM orders ord WHERE ord.storeId=? AND ord.createdAt BETWEEN ? AND ? AND ${buildOperationalOrderWhereSql('ord')}`,
      [q.storeId, q.range.from, q.range.to],
    );
    aggregates.aging = { '0_24h': Number(aging[0].a0 ?? 0), '24_48h': Number(aging[0].a1 ?? 0), '48_72h': Number(aging[0].a2 ?? 0), '72h_plus': Number(aging[0].a3 ?? 0) };
  }

  return { items: pickColumns(serializeReportRows(items), ['status', 'ordersCount', 'grossRevenueCents', 'netRevenueCents', 'avgOrderValueCents'], q.columns), pageInfo, grouped, aggregates, capabilities: capabilities() };
}

export async function reportsTopProducts(ctx: ActionContext, payload: any) {
  const q = normalizeTableQuery(payload, { sortBy: 'qtySold', sortDir: 'desc', pageSize: 50 }, { fallbackStoreId: ctx.storeId });
  const sortMap: Record<string, string> = { qtySold: 'qtySold', netRevenueCents: 'netRevenueCents' };
  const sortExpr = sortMap[q.sort.by] ?? sortMap.qtySold;
  const totalRows = await ctx.db.query(`SELECT COUNT(*) total FROM (SELECT oi.productId FROM order_items oi JOIN orders o ON o.id=oi.orderId WHERE o.storeId=? AND o.createdAt BETWEEN ? AND ? AND ${buildOperationalOrderWhereSql('o')} GROUP BY oi.productId) t`, [q.storeId, q.range.from, q.range.to]);
  const total = Number(totalRows[0]?.total ?? 0);
  if (q.fetchAll && total > 10000) throw new AppError('FETCH_ALL_LIMIT_EXCEEDED', 'Fetch all limit exceeded', { limit: 10000, total });
  const limit = q.fetchAll ? 10000 : q.pageSize;
  const offset = q.fetchAll ? 0 : (q.page - 1) * q.pageSize;
  const items = await ctx.db.query(
    `SELECT oi.productId productId, MAX(oi.nameSnapshot) name, MAX(pv.sku) sku, SUM(oi.qty) qtySold,
            COALESCE(SUM(oi.priceCents * oi.qty),0) grossRevenueCents,
            COALESCE(SUM((oi.priceCents * oi.qty) - FLOOR((o.discountCents * (oi.priceCents * oi.qty)) / NULLIF(o.subtotalCents,0))),0) netRevenueCents
     FROM order_items oi
     JOIN orders o ON o.id=oi.orderId
     LEFT JOIN product_variants pv ON pv.id=oi.variantId
     WHERE o.storeId=? AND o.createdAt BETWEEN ? AND ? AND ${buildOperationalOrderWhereSql('o')}
     GROUP BY oi.productId
     ORDER BY ${sortExpr} ${q.sort.dir === 'asc' ? 'ASC' : 'DESC'}
     LIMIT ? OFFSET ?`,
    [q.storeId, q.range.from, q.range.to, limit, offset],
  );

  let grouped: any = undefined;
  if (q.groupBy?.length) {
    grouped = { by: q.groupBy, groups: [] };
  }

  return { items: pickColumns(serializeReportRows(items), ['productId', 'name', 'sku', 'qtySold', 'grossRevenueCents', 'netRevenueCents'], q.columns), pageInfo: { page: q.fetchAll ? 1 : q.page, pageSize: q.fetchAll ? total : q.pageSize, total }, grouped, capabilities: capabilities() };
}

export async function reportsInventorySummary(ctx: ActionContext, payload: any) {
  const q = normalizeTableQuery(payload, { sortBy: 'name', sortDir: 'asc', pageSize: 50 }, { fallbackStoreId: ctx.storeId });
  const filters = q.filters as { lowStockOnly?: boolean; deadStockDays?: number; categoryId?: string };
  const deadStockDays = Number(filters.deadStockDays ?? 0);
  const params: any[] = [q.storeId];
  const whereParts = ["((p.mode='global' AND p.storeId IS NULL) OR (p.mode='store' AND p.storeId=?))"];
  if (filters.categoryId) { whereParts.push('(p.categoryId=? OR EXISTS (SELECT 1 FROM product_categories pc WHERE pc.productId=p.id AND pc.categoryId=?))'); params.push(filters.categoryId, filters.categoryId); }
  if (filters.lowStockOnly) whereParts.push('COALESCE(ib.onHandQty,0) <= 5');

  const totalRows = await ctx.db.query(`SELECT COUNT(*) total FROM products p LEFT JOIN inventory_balances ib ON ib.productId=p.id AND ib.storeId=? WHERE ${whereParts.join(' AND ')}`, [q.storeId, ...params]);
  const total = Number(totalRows[0]?.total ?? 0);
  if (q.fetchAll && total > 10000) throw new AppError('FETCH_ALL_LIMIT_EXCEEDED', 'Fetch all limit exceeded', { limit: 10000, total });
  const limit = q.fetchAll ? 10000 : q.pageSize;
  const offset = q.fetchAll ? 0 : (q.page - 1) * q.pageSize;
  const sortMap: Record<string, string> = { onHandQty: 'onHandQty', availableQty: 'availableQty', name: 'name' };
  const sortExpr = sortMap[q.sort.by] ?? sortMap.name;
  const items = await ctx.db.query(
    `SELECT p.id productId, p.name name, COALESCE(ib.onHandQty,0) onHandQty, 0 reservedQty, COALESCE(ib.onHandQty,0) availableQty,
            (COALESCE(ib.onHandQty,0) <= 5) lowStock,
            MAX(ia.createdAt) lastMovementAt
      FROM products p
      LEFT JOIN inventory_balances ib ON ib.productId=p.id AND ib.storeId=?
      LEFT JOIN inventory_adjustments ia ON ia.productId=p.id AND ia.storeId=?
      WHERE ${whereParts.join(' AND ')}
      GROUP BY p.id,p.name,ib.onHandQty
      ORDER BY ${sortExpr} ${q.sort.dir === 'asc' ? 'ASC' : 'DESC'}
      LIMIT ? OFFSET ?`,
    [q.storeId, q.storeId, ...params, limit, offset],
  );
  const deadStockBoundary = deadStockDays > 0 ? `DATE_SUB(NOW(), INTERVAL ${deadStockDays} DAY)` : null;
  const aggr = await ctx.db.query(
    `SELECT COUNT(*) totalProducts,
            SUM(CASE WHEN COALESCE(ib.onHandQty,0) <= 5 THEN 1 ELSE 0 END) lowStockCount,
            SUM(CASE WHEN COALESCE(ib.onHandQty,0) > 0 ${deadStockBoundary ? `AND (MAX_IA.lastMovementAt IS NULL OR MAX_IA.lastMovementAt < ${deadStockBoundary})` : 'AND 1=0'} THEN 1 ELSE 0 END) deadStockCount
     FROM products p
     LEFT JOIN inventory_balances ib ON ib.productId=p.id AND ib.storeId=?
     LEFT JOIN (
       SELECT storeId, productId, MAX(createdAt) lastMovementAt FROM inventory_adjustments GROUP BY storeId, productId
     ) MAX_IA ON MAX_IA.storeId=p.storeId AND MAX_IA.productId=p.id
     WHERE ${whereParts.join(' AND ')}`,
    [q.storeId, ...params],
  );

  const extraAggregates: Record<string, unknown> = {};
  if (payload.flags?.includeValuation) {
    extraAggregates.valuationAvailable = false;
    extraAggregates.inventoryValuationCents = null;
  }
  if (payload.flags?.includeMovements) {
    const mov = await ctx.db.query(`SELECT COUNT(*) movementsCount, COALESCE(SUM(ABS(deltaQty)),0) movedQty FROM inventory_adjustments WHERE storeId=? AND createdAt BETWEEN ? AND ?`, [q.storeId, q.range.from, q.range.to]);
    extraAggregates.movements = mov[0];
  }
  return { items: pickColumns(serializeReportRows(items), ['productId', 'name', 'onHandQty', 'reservedQty', 'availableQty', 'lowStock', 'lastMovementAt'], q.columns), pageInfo: { page: q.fetchAll ? 1 : q.page, pageSize: q.fetchAll ? total : q.pageSize, total }, grouped: undefined, aggregates: { ...aggr[0], ...extraAggregates }, capabilities: capabilities() };
}

export async function reportsCustomersSummary(ctx: ActionContext, payload: any) {
  const q = normalizeTableQuery(payload, { sortBy: 'netRevenueCents', sortDir: 'desc', pageSize: 50 }, { fallbackStoreId: ctx.storeId });
  const totalRows = await ctx.db.query(`SELECT COUNT(*) total FROM (SELECT uid FROM orders ord WHERE ord.storeId=? AND ord.createdAt BETWEEN ? AND ? AND ${buildOperationalOrderWhereSql('ord')} GROUP BY uid) t`, [q.storeId, q.range.from, q.range.to]);
  const total = Number(totalRows[0]?.total ?? 0);
  if (q.fetchAll && total > 10000) throw new AppError('FETCH_ALL_LIMIT_EXCEEDED', 'Fetch all limit exceeded', { limit: 10000, total });
  const limit = q.fetchAll ? 10000 : q.pageSize;
  const offset = q.fetchAll ? 0 : (q.page - 1) * q.pageSize;
  const sortMap: Record<string, string> = { netRevenueCents: 'netRevenueCents', ordersCount: 'ordersCount', lastOrderAt: 'lastOrderAt' };
  const sortExpr = sortMap[q.sort.by] ?? sortMap.netRevenueCents;

  const items = await ctx.db.query(
    `SELECT o.uid customerId, MAX(up.displayName) name, COUNT(*) ordersCount, SUM(o.totalCents) netRevenueCents, MAX(o.createdAt) lastOrderAt
     FROM orders o
     LEFT JOIN user_profiles up ON up.uid=o.uid
     WHERE o.storeId=? AND o.createdAt BETWEEN ? AND ? AND ${buildOperationalOrderWhereSql('o')}
     GROUP BY o.uid
     ORDER BY ${sortExpr} ${q.sort.dir === 'asc' ? 'ASC' : 'DESC'}
     LIMIT ? OFFSET ?`,
    [q.storeId, q.range.from, q.range.to, limit, offset],
  );

  const aggregates = await ctx.db.query(
    `SELECT COUNT(DISTINCT uid) totalCustomers, SUM(CASE WHEN lastOrderAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) activeCustomersCount
     FROM (
       SELECT uid, MAX(createdAt) lastOrderAt
       FROM orders ord
      WHERE ord.storeId=? AND ord.createdAt BETWEEN ? AND ? AND ${buildOperationalOrderWhereSql('ord')}
       GROUP BY uid
     ) x`,
    [q.storeId, q.range.from, q.range.to],
  );

  const extras: Record<string, unknown> = {};
  if (payload.flags?.includeCohorts) {
    const cohorts = await ctx.db.query(`SELECT DATE_FORMAT(firstOrderAt, '%Y-%m') cohortMonth, COUNT(*) customers FROM (SELECT uid, MIN(createdAt) firstOrderAt FROM orders ord WHERE ord.storeId=? AND ${buildOperationalOrderWhereSql('ord')} GROUP BY uid) x GROUP BY cohortMonth ORDER BY cohortMonth`, [q.storeId]);
    extras.cohorts = cohorts;
  }
  if (payload.flags?.includeLtv) {
    const ltv = await ctx.db.query(`SELECT COALESCE(AVG(totalSpent),0) avgLtvCents, COALESCE(SUM(totalSpent),0) totalLtvCents FROM (SELECT uid, SUM(totalCents) totalSpent FROM orders ord WHERE ord.storeId=? AND ${buildOperationalOrderWhereSql('ord')} GROUP BY uid) x`, [q.storeId]);
    extras.ltvAvailable = true;
    extras.ltv = ltv[0];
  }
  return { items: pickColumns(serializeReportRows(items), ['customerId', 'name', 'ordersCount', 'netRevenueCents', 'lastOrderAt'], q.columns), pageInfo: { page: q.fetchAll ? 1 : q.page, pageSize: q.fetchAll ? total : q.pageSize, total }, grouped: undefined, aggregates: { ...aggregates[0], ...extras }, capabilities: capabilities() };
}

export async function reportsReturnsSummary(ctx: ActionContext, payload: any) {
  const q = normalizeTableQuery(payload, { sortBy: 'returnsCount', sortDir: 'desc', pageSize: 50 }, { fallbackStoreId: ctx.storeId });
  const totalRows = await ctx.db.query(`SELECT COUNT(*) total FROM (SELECT status FROM returns WHERE storeId=? AND requestedAt BETWEEN ? AND ? GROUP BY status) t`, [q.storeId, q.range.from, q.range.to]);
  const total = Number(totalRows[0]?.total ?? 0);
  if (q.fetchAll && total > 10000) throw new AppError('FETCH_ALL_LIMIT_EXCEEDED', 'Fetch all limit exceeded', { limit: 10000, total });
  const limit = q.fetchAll ? 10000 : q.pageSize;
  const offset = q.fetchAll ? 0 : (q.page - 1) * q.pageSize;
  const sortMap: Record<string, string> = { returnsCount: 'returnsCount', refundCents: 'refundCents' };
  const sortExpr = sortMap[q.sort.by] ?? sortMap.returnsCount;

  const items = await ctx.db.query(
    `SELECT r.status reason, COUNT(*) returnsCount, COALESCE(SUM(ref.amountCents),0) refundCents
     FROM returns r
     LEFT JOIN refunds ref ON ref.returnId=r.id
     WHERE r.storeId=? AND r.requestedAt BETWEEN ? AND ?
     GROUP BY r.status
     ORDER BY ${sortExpr} ${q.sort.dir === 'asc' ? 'ASC' : 'DESC'}
     LIMIT ? OFFSET ?`,
    [q.storeId, q.range.from, q.range.to, limit, offset],
  );
  const aggregates = await ctx.db.query(
    `SELECT COUNT(*) returnsCountTotal, COALESCE(SUM(ref.amountCents),0) refundCentsTotal
     FROM returns r LEFT JOIN refunds ref ON ref.returnId=r.id
     WHERE r.storeId=? AND r.requestedAt BETWEEN ? AND ?`,
    [q.storeId, q.range.from, q.range.to],
  );

  const returnExtras: Record<string, unknown> = {};
  if (payload.flags?.includeRefundCosts) {
    returnExtras.refundCostsAvailable = false;
    returnExtras.refundProcessingCents = null;
  }
  return { items: pickColumns(serializeReportRows(items), ['reason', 'returnsCount', 'refundCents'], q.columns), pageInfo: { page: q.fetchAll ? 1 : q.page, pageSize: q.fetchAll ? total : q.pageSize, total }, grouped: undefined, aggregates: { ...aggregates[0], ...returnExtras }, capabilities: capabilities() };
}

export async function reportsLoyaltySummary(ctx: ActionContext, payload: any) {
  const q = normalizeTableQuery(payload, { sortBy: 'day', sortDir: 'desc', pageSize: 50 }, { fallbackStoreId: ctx.storeId });
  const aggregates = await ctx.db.query(
    `SELECT COALESCE(SUM(CASE WHEN pointsDelta>0 THEN pointsDelta ELSE 0 END),0) pointsIssued,
            COALESCE(SUM(CASE WHEN pointsDelta<0 THEN ABS(pointsDelta) ELSE 0 END),0) pointsRedeemed,
            COUNT(DISTINCT uid) activeMembers
     FROM loyalty_transactions WHERE storeId=? AND createdAt BETWEEN ? AND ?`,
    [q.storeId, q.range.from, q.range.to],
  );
  const items = await ctx.db.query(
    `SELECT DATE(lt.createdAt) day, COALESCE(ut.name,'unknown') tier, SUM(lt.pointsDelta) pointsDelta
     FROM loyalty_transactions lt
     LEFT JOIN (
       SELECT uid, MAX(COALESCE(displayName,'')) name FROM user_profiles GROUP BY uid
     ) ut ON ut.uid=lt.uid
     WHERE lt.storeId=? AND lt.createdAt BETWEEN ? AND ?
     GROUP BY DATE(lt.createdAt), tier
     ORDER BY day DESC
     LIMIT ? OFFSET ?`,
    [q.storeId, q.range.from, q.range.to, q.fetchAll ? 10000 : q.pageSize, q.fetchAll ? 0 : (q.page - 1) * q.pageSize],
  );
  return { items: pickColumns(serializeReportRows(items), ['day', 'tier', 'pointsDelta'], q.columns), pageInfo: { page: q.fetchAll ? 1 : q.page, pageSize: q.fetchAll ? items.length : q.pageSize, total: items.length }, grouped: undefined, aggregates: aggregates[0], capabilities: capabilities() };
}

export async function reportsCashbackSummary(ctx: ActionContext, payload: any) {
  const q = normalizeTableQuery(payload, { sortBy: 'day', sortDir: 'desc', pageSize: 50 }, { fallbackStoreId: ctx.storeId });
  const aggregates = await ctx.db.query(
    `SELECT
      COALESCE(SUM(CASE WHEN wt.type='cashback_issue' THEN wt.amountCents ELSE 0 END),0) cashbackIssuedCents,
      COALESCE(SUM(CASE WHEN wt.type='cashback_redeem' THEN ABS(wt.amountCents) ELSE 0 END),0) cashbackRedeemedCents,
      COUNT(DISTINCT wt.uid) activeUsers
     FROM wallet_transactions wt
     JOIN orders o ON o.uid=wt.uid AND o.storeId=?
     WHERE wt.createdAt BETWEEN ? AND ?`,
    [q.storeId, q.range.from, q.range.to],
  );
  const items = await ctx.db.query(
    `SELECT DATE(wt.createdAt) day, 'default' campaignId,
            SUM(CASE WHEN wt.type='cashback_issue' THEN wt.amountCents ELSE 0 END) cashbackIssuedCents,
            SUM(CASE WHEN wt.type='cashback_redeem' THEN ABS(wt.amountCents) ELSE 0 END) cashbackRedeemedCents
     FROM wallet_transactions wt
     JOIN orders o ON o.uid=wt.uid AND o.storeId=?
     WHERE wt.createdAt BETWEEN ? AND ?
     GROUP BY DATE(wt.createdAt)
     ORDER BY day DESC
     LIMIT ? OFFSET ?`,
    [q.storeId, q.range.from, q.range.to, q.fetchAll ? 10000 : q.pageSize, q.fetchAll ? 0 : (q.page - 1) * q.pageSize],
  );
  return { items: pickColumns(serializeReportRows(items), ['day', 'campaignId', 'cashbackIssuedCents', 'cashbackRedeemedCents'], q.columns), pageInfo: { page: q.fetchAll ? 1 : q.page, pageSize: q.fetchAll ? items.length : q.pageSize, total: items.length }, grouped: undefined, aggregates: aggregates[0], capabilities: capabilities() };
}

