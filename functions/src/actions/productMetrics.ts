import { EntityManager } from 'typeorm';
import { Product } from '../entities/Product';

const POPULARITY_RATING_MULTIPLIER = 20;
const POPULARITY_FAVORITE_WEIGHT = 3;
const POPULARITY_COMPLETED_ORDER_WEIGHT = 2;
const POPULARITY_RATING_COUNT_CAP = 50;

const EXCLUDED_ORDER_STATUSES = ['pending_payment', 'cancelled', 'rejected', 'failed', 'draft'];

function toNum(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function recomputeProductRatingMetrics(tx: EntityManager, productId: string, storeId?: string) {
  const where = storeId ? 'WHERE productId=? AND storeId=?' : 'WHERE productId=?';
  const params = storeId ? [productId, storeId] : [productId];
  const [row] = await tx.getRepository(Product).query(
    `SELECT COUNT(*) ratingCount, COALESCE(AVG(rating), 0) ratingAverage FROM order_reviews ${where}`,
    params,
  );

  const ratingCount = Math.max(0, Math.floor(toNum(row?.ratingCount)));
  const ratingAverage = ratingCount > 0 ? Number(toNum(row?.ratingAverage).toFixed(2)) : 0;

  return { ratingCount, ratingAverage };
}

export async function recomputeProductPopularityMetrics(tx: EntityManager, productId: string, ratingAverage: number, ratingCount: number, storeId?: string) {
  const [favoriteRow] = await tx.getRepository(Product).query('SELECT COUNT(*) favoriteCount FROM user_product_favorites WHERE productId=?', [productId]);
  const storeSql = storeId ? 'AND o.storeId=?' : '';
  const [ordersRow] = await tx.getRepository(Product).query(
    `SELECT COALESCE(SUM(oi.qty),0) completedOrderQty
     FROM order_items oi
     INNER JOIN orders o ON o.id=oi.orderId
     WHERE oi.productId=? ${storeSql} AND o.paymentStatus='paid' AND o.status NOT IN (${EXCLUDED_ORDER_STATUSES.map(() => '?').join(',')})`,
    storeId ? [productId, storeId, ...EXCLUDED_ORDER_STATUSES] : [productId, ...EXCLUDED_ORDER_STATUSES],
  );

  const favoriteCount = Math.max(0, Math.floor(toNum(favoriteRow?.favoriteCount)));
  const completedOrderQty = Math.max(0, Math.floor(toNum(ordersRow?.completedOrderQty)));
  const popularityScore =
    (favoriteCount * POPULARITY_FAVORITE_WEIGHT)
    + (completedOrderQty * POPULARITY_COMPLETED_ORDER_WEIGHT)
    + Math.round(ratingAverage * POPULARITY_RATING_MULTIPLIER)
    + Math.min(ratingCount, POPULARITY_RATING_COUNT_CAP);

  return { favoriteCount, completedOrderQty, popularityScore };
}

export async function recomputeProductMetrics(tx: EntityManager, productId: string, storeId?: string) {
  const rating = await recomputeProductRatingMetrics(tx, productId, storeId);
  const popularity = await recomputeProductPopularityMetrics(tx, productId, rating.ratingAverage, rating.ratingCount, storeId);

  await tx.getRepository(Product).update(
    { id: productId },
    {
      ratingAverage: rating.ratingAverage.toFixed(2),
      ratingCount: rating.ratingCount,
      favoriteCount: popularity.favoriteCount,
      completedOrderQty: popularity.completedOrderQty,
      popularityScore: popularity.popularityScore,
    },
  );

  return {
    ...rating,
    ...popularity,
  };
}

export async function recomputeStoreProductsMetrics(tx: EntityManager, storeId: string) {
  const rows = await tx.getRepository(Product).query(
    "SELECT id FROM products WHERE (mode='global' AND storeId IS NULL) OR (mode='store' AND storeId=?)",
    [storeId],
  );
  for (const row of rows) {
    await recomputeProductMetrics(tx, row.id, storeId);
  }
  return { updated: rows.length };
}
