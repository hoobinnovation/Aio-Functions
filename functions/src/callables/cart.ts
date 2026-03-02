import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../db/data-source';
import { CartEntity } from '../db/entities/CartEntity';
import { CartItemEntity } from '../db/entities/CartItemEntity';
import { ProductEntity } from '../db/entities/ProductEntity';
import { ProductVariantEntity } from '../db/entities/ProductVariantEntity';
import { CouponEntity } from '../db/entities/CouponEntity';
import { verifyFirebaseUser } from '../lib/auth';
import { computeTargetedDiscount } from '../lib/discounts';
import { failedPrecondition, mapError, notFound } from '../lib/errors';
import { uuidSchema, validatePayload } from '../lib/validators';

const getOrCreateCart = async (uid: string, storeId: string): Promise<CartEntity> => {
  const ds = await getDataSource();
  const repo = ds.getRepository(CartEntity);
  let cart = await repo.findOne({ where: { uid, storeId, isActive: true } });
  if (!cart) {
    cart = await repo.save(repo.create({ uid, storeId, isActive: true }));
  }
  return cart;
};

export const cartGet = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required() }), request.data);

    const cart = await getOrCreateCart(uid, payload.storeId);
    const ds = await getDataSource();
    const itemRows = await ds.getRepository(CartItemEntity).find({ where: { cartId: cart.id } });
    const products = await ds.getRepository(ProductEntity).findBy({ id: itemRows.map((i) => i.productId) as any });
    const variants = await ds.getRepository(ProductVariantEntity).findBy({ id: itemRows.map((i) => i.variantId) as any });
    const pMap = new Map(products.map((x) => [x.id, x]));
    const vMap = new Map(variants.map((x) => [x.id, x]));
    const items = itemRows.map((i) => {
      const p = pMap.get(i.productId)!;
      const v = vMap.get(i.variantId)!;
      const unit = Number(v.priceOverride ?? p.price);
      return { ...i, unitPrice: unit, lineTotal: unit * i.qty };
    });
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const discount = await computeTargetedDiscount({ storeId: payload.storeId, uid, items: items.map((i) => ({ productId: i.productId, qty: i.qty, lineTotal: i.lineTotal })), subtotal });
    return { cart, items, subtotal, targetedDiscountTotal: discount.targetedDiscountTotal, appliedCampaigns: discount.appliedCampaigns };
  } catch (error) {
    mapError(error);
  }
});

export const cartAddItem = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(
      Joi.object({ storeId: uuidSchema.required(), productId: uuidSchema.required(), variantId: uuidSchema.required(), qty: Joi.number().integer().min(1).max(50).required() }),
      request.data,
    );

    const ds = await getDataSource();
    const cart = await getOrCreateCart(uid, payload.storeId);
    const product = await ds.getRepository(ProductEntity).findOne({ where: { id: payload.productId, storeId: payload.storeId, isDisabled: false } });
    if (!product) notFound('Product not found.');
    const variant = await ds.getRepository(ProductVariantEntity).findOne({ where: { id: payload.variantId, productId: payload.productId, storeId: payload.storeId, isActive: true } });
    if (!variant) notFound('Variant not found.');

    const repo = ds.getRepository(CartItemEntity);
    let item = await repo.findOne({ where: { cartId: cart.id, variantId: payload.variantId } });
    const qty = (item?.qty ?? 0) + payload.qty;
    if (variant.stockQty < qty) failedPrecondition('Insufficient stock.');

    if (!item) {
      item = repo.create({ cartId: cart.id, storeId: payload.storeId, productId: payload.productId, variantId: payload.variantId, qty });
    } else {
      item.qty = qty;
    }
    const saved = await repo.save(item);
    return { item: saved };
  } catch (error) {
    mapError(error);
  }
});

export const cartSetItemQty = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), itemId: uuidSchema.required(), qty: Joi.number().integer().min(1).max(50).required() }), request.data);
    const ds = await getDataSource();
    const cart = await getOrCreateCart(uid, payload.storeId);
    const repo = ds.getRepository(CartItemEntity);
    const item = await repo.findOne({ where: { id: payload.itemId, cartId: cart.id, storeId: payload.storeId } });
    if (!item) notFound('Cart item not found.');

    const variant = await ds.getRepository(ProductVariantEntity).findOne({ where: { id: item.variantId, storeId: payload.storeId, isActive: true } });
    if (!variant) notFound('Variant not found.');
    if (variant.stockQty < payload.qty) failedPrecondition('Insufficient stock.');

    item.qty = payload.qty;
    return { item: await repo.save(item) };
  } catch (error) {
    mapError(error);
  }
});

export const cartRemoveItem = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), itemId: uuidSchema.required() }), request.data);
    const cart = await getOrCreateCart(uid, payload.storeId);
    await (await getDataSource()).getRepository(CartItemEntity).delete({ id: payload.itemId, cartId: cart.id });
    return { success: true };
  } catch (error) {
    mapError(error);
  }
});

export const cartApplyCoupon = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), code: Joi.string().trim().uppercase().allow(null, '') }), request.data);
    const ds = await getDataSource();
    const cart = await getOrCreateCart(uid, payload.storeId);
    const cartRepo = ds.getRepository(CartEntity);

    if (!payload.code) {
      cart.couponCode = null;
      await cartRepo.save(cart);
      return { couponCode: null };
    }

    const coupon = await ds.getRepository(CouponEntity).findOne({ where: { storeId: payload.storeId, code: payload.code, isActive: true } });
    if (!coupon) notFound('Coupon not found.');

    cart.couponCode = payload.code;
    await cartRepo.save(cart);
    return { couponCode: payload.code };
  } catch (error) {
    mapError(error);
  }
});
