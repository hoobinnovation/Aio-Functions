import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../../db/data-source';
import { ProductEntity } from '../../db/entities/ProductEntity';
import { ProductVariantEntity } from '../../db/entities/ProductVariantEntity';
import { writeAudit } from '../../lib/audit';
import { verifyAdminRole, verifyFirebaseUser, verifyStoreAccess } from '../../lib/auth';
import { mapError, notFound } from '../../lib/errors';
import { uuidSchema, validatePayload } from '../../lib/validators';

const access = async (uid: string, storeId: string) => {
  await verifyAdminRole(uid, ['SUPER_ADMIN', 'STORE_ADMIN']);
  await verifyStoreAccess(uid, storeId);
};

export const adminProductsList = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), q: Joi.string().allow('', null), page: Joi.number().integer().min(1).default(1), pageSize: Joi.number().integer().min(1).max(100).default(20) }), request.data);
    const uid = verifyFirebaseUser(request);
    await access(uid, payload.storeId);
    const repo = (await getDataSource()).getRepository(ProductEntity);
    const qb = repo.createQueryBuilder('p').where('p.storeId = :storeId', { storeId: payload.storeId });
    if (payload.q) qb.andWhere('p.name LIKE :q', { q: `%${payload.q}%` });
    const total = await qb.getCount();
    const items = await qb.orderBy('p.createdAt', 'DESC').skip((payload.page - 1) * payload.pageSize).take(payload.pageSize).getMany();
    return { items, total };
  } catch (error) { mapError(error); }
});

export const adminProductsCreate = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), payload: Joi.object({ name: Joi.string().required(), thumbnailUrl: Joi.string().uri().required(), price: Joi.number().positive().required(), currency: Joi.string().default('EGP'), categoryId: uuidSchema.allow(null), stockQty: Joi.number().integer().min(0).required(), variantName: Joi.string().default('Default') }).required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await access(uid, payload.storeId);

    const ds = await getDataSource();
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const prodRepo = qr.manager.getRepository(ProductEntity);
      const varRepo = qr.manager.getRepository(ProductVariantEntity);
      const product = await prodRepo.save(prodRepo.create({ storeId: payload.storeId, categoryId: payload.payload.categoryId ?? null, name: payload.payload.name, thumbnailUrl: payload.payload.thumbnailUrl, price: Number(payload.payload.price).toFixed(2), currency: payload.payload.currency }));
      const variant = await varRepo.save(varRepo.create({ storeId: payload.storeId, productId: product.id, name: payload.payload.variantName, stockQty: payload.payload.stockQty }));
      await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.product.create', targetType: 'product', targetId: product.id, storeId: payload.storeId }, qr.manager);
      await qr.commitTransaction();
      return { product, variant };
    } catch (e) { await qr.rollbackTransaction(); throw e; } finally { await qr.release(); }
  } catch (error) { mapError(error); }
});

export const adminProductsUpdate = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), productId: uuidSchema.required(), payload: Joi.object({ name: Joi.string(), thumbnailUrl: Joi.string().uri(), price: Joi.number().positive(), categoryId: uuidSchema.allow(null), isDisabled: Joi.boolean(), isFeatured: Joi.boolean() }).min(1).required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await access(uid, payload.storeId);
    const repo = (await getDataSource()).getRepository(ProductEntity);
    const product = await repo.findOne({ where: { id: payload.productId, storeId: payload.storeId } });
    if (!product) notFound('Product not found.');
    Object.assign(product, payload.payload);
    if (payload.payload.price !== undefined) product.price = Number(payload.payload.price).toFixed(2);
    const saved = await repo.save(product);
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.product.update', targetType: 'product', targetId: saved.id, storeId: payload.storeId });
    return { product: saved };
  } catch (error) { mapError(error); }
});

export const adminProductsSetVariantStock = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), variantId: uuidSchema.required(), stockQty: Joi.number().integer().min(0).required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await access(uid, payload.storeId);
    const repo = (await getDataSource()).getRepository(ProductVariantEntity);
    const variant = await repo.findOne({ where: { id: payload.variantId, storeId: payload.storeId } });
    if (!variant) notFound('Variant not found.');
    variant.stockQty = payload.stockQty;
    const saved = await repo.save(variant);
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.product.variant_stock', targetType: 'variant', targetId: saved.id, storeId: payload.storeId, metadata: { stockQty: saved.stockQty } });
    return { variant: saved };
  } catch (error) { mapError(error); }
});


export const adminProductsSearch = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), q: Joi.string().allow('', null), page: Joi.number().integer().min(1).default(1), pageSize: Joi.number().integer().min(1).max(100).default(20) }), request.data);
    const uid = verifyFirebaseUser(request);
    await access(uid, payload.storeId);

    const qb = (await getDataSource()).getRepository(ProductEntity).createQueryBuilder('p').where('p.storeId = :storeId', { storeId: payload.storeId }).andWhere('p.isDisabled = false');
    if (payload.q) qb.andWhere('p.name LIKE :q', { q: `%${payload.q}%` });
    const total = await qb.getCount();
    const items = await qb.orderBy('p.createdAt', 'DESC').skip((payload.page - 1) * payload.pageSize).take(payload.pageSize).getMany();
    return { items, total };
  } catch (error) { mapError(error); }
});
