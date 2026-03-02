import { DataSource, In } from 'typeorm';
import { CartEntity } from '../db/entities/CartEntity';
import { CartItemEntity } from '../db/entities/CartItemEntity';
import { CouponEntity } from '../db/entities/CouponEntity';
import { ProductEntity } from '../db/entities/ProductEntity';
import { ProductVariantEntity } from '../db/entities/ProductVariantEntity';
import { ShippingMethodEntity } from '../db/entities/ShippingMethodEntity';
import { UserAddressEntity } from '../db/entities/UserAddressEntity';
import { failedPrecondition, notFound } from './errors';
import { computeTargetedDiscount } from './discounts';

export type CheckoutPreview = {
  cartId: string;
  items: Array<{
    cartItemId: string;
    productId: string;
    variantId: string;
    name: string;
    thumbnailUrl: string;
    variantName: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  targetedDiscountTotal: number;
  appliedCampaigns: Array<{ id: string; name: string; amount: number }>;
  total: number;
  currency: string;
  address: UserAddressEntity;
  shippingMethod: ShippingMethodEntity;
  coupon: CouponEntity | null;
};

const calcShipping = (method: ShippingMethodEntity, address: UserAddressEntity): number => {
  if (method.type === 'pickup') return 0;
  if (method.type === 'flat') return Number(method.cost);

  const rules = (method.rules ?? {}) as { areas?: Array<{ area: string; cost: number }> };
  const match = rules.areas?.find((x) => x.area.toLowerCase() === address.area.toLowerCase());
  if (!match) {
    failedPrecondition('Shipping method not available for this area.');
  }
  return Number(match.cost ?? method.cost);
};

export const resolveCheckoutPreview = async (
  ds: DataSource,
  uid: string,
  storeId: string,
  addressId: string,
  shippingMethodId: string,
): Promise<CheckoutPreview> => {
  const cartRepo = ds.getRepository(CartEntity);
  const cartItemRepo = ds.getRepository(CartItemEntity);
  const productRepo = ds.getRepository(ProductEntity);
  const variantRepo = ds.getRepository(ProductVariantEntity);
  const addressRepo = ds.getRepository(UserAddressEntity);
  const shippingRepo = ds.getRepository(ShippingMethodEntity);
  const couponRepo = ds.getRepository(CouponEntity);

  const cart = await cartRepo.findOne({ where: { uid, storeId, isActive: true } });
  if (!cart) {
    failedPrecondition('Cart is empty.');
  }

  const cartItems = await cartItemRepo.find({ where: { cartId: cart.id, storeId } });
  if (!cartItems.length) {
    failedPrecondition('Cart is empty.');
  }

  const address = await addressRepo.findOne({ where: { id: addressId, uid, storeId } });
  if (!address) notFound('Address not found.');

  const shippingMethod = await shippingRepo.findOne({ where: { id: shippingMethodId, storeId, isActive: true } });
  if (!shippingMethod) notFound('Shipping method not found.');

  const productIds = cartItems.map((c) => c.productId);
  const variantIds = cartItems.map((c) => c.variantId);

  const products = await productRepo.find({ where: { id: In(productIds), storeId, isDisabled: false } });
  const variants = await variantRepo.find({ where: { id: In(variantIds), storeId, isActive: true } });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const items = cartItems.map((item) => {
    const product = productMap.get(item.productId);
    const variant = variantMap.get(item.variantId);
    if (!product || !variant) {
      failedPrecondition('One or more cart items are no longer available.');
    }
    if (variant.stockQty < item.qty) {
      failedPrecondition(`Insufficient stock for ${product.name}.`);
    }

    const unitPrice = Number(variant.priceOverride ?? product.price);
    const lineTotal = unitPrice * item.qty;

    return {
      cartItemId: item.id,
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      thumbnailUrl: product.thumbnailUrl,
      variantName: variant.name,
      qty: item.qty,
      unitPrice,
      lineTotal,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shippingTotal = calcShipping(shippingMethod, address);
  const taxTotal = 0;

  let coupon: CouponEntity | null = null;
  let discountTotal = 0;
  const code = (cart as CartEntity & { couponCode?: string | null }).couponCode;
  if (code) {
    coupon = await couponRepo.findOne({ where: { storeId, code, isActive: true } });
    if (coupon) {
      if (coupon.minOrderTotal && subtotal < Number(coupon.minOrderTotal)) {
        coupon = null;
      } else if (coupon.discountType === 'percent') {
        discountTotal = Math.min(subtotal, (subtotal * Number(coupon.discountValue)) / 100);
      } else {
        discountTotal = Math.min(subtotal, Number(coupon.discountValue));
      }
    }
  }

  const targeted = await computeTargetedDiscount({
    storeId,
    uid,
    subtotal,
    items: items.map((i) => ({ productId: i.productId, qty: i.qty, lineTotal: i.lineTotal })),
  });

  const total = subtotal - discountTotal - targeted.targetedDiscountTotal + shippingTotal + taxTotal;

  return {
    cartId: cart.id,
    items,
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal,
    targetedDiscountTotal: targeted.targetedDiscountTotal,
    appliedCampaigns: targeted.appliedCampaigns,
    total,
    currency: products[0]?.currency ?? 'EGP',
    address,
    shippingMethod,
    coupon,
  };
};
