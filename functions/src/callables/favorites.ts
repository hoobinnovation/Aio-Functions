import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { In } from 'typeorm';
import { getDataSource } from '../db/data-source';
import { ProductEntity } from '../db/entities/ProductEntity';
import { UserFavoriteEntity } from '../db/entities/UserFavoriteEntity';
import { verifyFirebaseUser } from '../lib/auth';
import { mapError, notFound } from '../lib/errors';
import { uuidSchema, validatePayload } from '../lib/validators';

export const favoritesList = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required() }), request.data);

    const repo = (await getDataSource()).getRepository(UserFavoriteEntity);
    const items = await repo.find({ where: { uid, storeId: payload.storeId }, order: { createdAt: 'DESC' } });

    const products = await (await getDataSource()).getRepository(ProductEntity).find({ where: { id: In(items.map((x) => x.productId)) } });
    const map = new Map(products.map((p) => [p.id, p]));

    return { items: items.map((i) => ({ ...i, product: map.get(i.productId) ?? null })) };
  } catch (error) {
    mapError(error);
  }
});

export const favoritesToggle = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(
      Joi.object({ storeId: uuidSchema.required(), productId: uuidSchema.required(), variantId: uuidSchema.allow(null) }),
      request.data,
    );

    const ds = await getDataSource();
    const product = await ds.getRepository(ProductEntity).findOne({ where: { id: payload.productId, storeId: payload.storeId } });
    if (!product) notFound('Product not found.');

    const repo = ds.getRepository(UserFavoriteEntity);
    const existing = await repo.findOne({ where: { uid, storeId: payload.storeId, productId: payload.productId, variantId: payload.variantId ?? null } });
    if (existing) {
      await repo.delete({ id: existing.id });
      return { isFavorite: false };
    }

    await repo.save(repo.create({ uid, storeId: payload.storeId, productId: payload.productId, variantId: payload.variantId ?? null }));
    return { isFavorite: true };
  } catch (error) {
    mapError(error);
  }
});
