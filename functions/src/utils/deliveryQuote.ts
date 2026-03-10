import { EntityManager } from 'typeorm';
import { AppError } from '../core/errors';
import { DeliveryZone } from '../entities/DeliveryZone';
import { ShippingMethod } from '../entities/ShippingMethod';

export interface DeliveryQuoteInput {
  storeId: string;
  zoneId?: string;
  shippingMethodId?: string;
  serviceType?: string;
}

export interface DeliveryQuoteResult {
  zoneId: string;
  zoneName: string;
  shippingMethodId: string | null;
  shippingMethodName: string | null;
  zonePriceCents: number;
  shippingMethodBasePriceCents: number;
  deliveryFeeCents: number;
}

export async function resolveDeliveryQuote(tx: EntityManager, input: DeliveryQuoteInput): Promise<DeliveryQuoteResult> {
  if ((input.serviceType ?? 'standard') !== 'delivery') {
    return {
      zoneId: '',
      zoneName: '',
      shippingMethodId: input.shippingMethodId ?? null,
      shippingMethodName: null,
      zonePriceCents: 0,
      shippingMethodBasePriceCents: 0,
      deliveryFeeCents: 0,
    };
  }

  if (!input.zoneId) {
    throw new AppError('DELIVERY_ZONE_REQUIRED', 'zoneId is required for delivery');
  }

  const zone = await tx.getRepository(DeliveryZone).findOneBy({
    id: input.zoneId,
    storeId: input.storeId,
  });

  if (!zone) {
    throw new AppError('DELIVERY_ZONE_INVALID', 'Delivery zone is invalid for this store');
  }

  if (zone.status !== 'active') {
    throw new AppError('DELIVERY_ZONE_UNAVAILABLE', 'Delivery zone is currently unavailable');
  }

  let method: ShippingMethod | null = null;
  if (input.shippingMethodId) {
    method = await tx.getRepository(ShippingMethod).findOneBy({
      id: input.shippingMethodId,
      storeId: input.storeId,
    });

    if (!method) {
      throw new AppError('SHIPPING_METHOD_INVALID', 'Shipping method is invalid for this store');
    }

    if (method.status !== 'active') {
      throw new AppError('SHIPPING_METHOD_UNAVAILABLE', 'Shipping method is currently unavailable');
    }
  }

  const zonePriceCents = Number(zone.priceCents);
  const shippingMethodBasePriceCents = method ? Number(method.basePriceCents) : 0;

  return {
    zoneId: zone.id,
    zoneName: zone.name,
    shippingMethodId: method?.id ?? null,
    shippingMethodName: method?.name ?? null,
    zonePriceCents,
    shippingMethodBasePriceCents,
    deliveryFeeCents: zonePriceCents + shippingMethodBasePriceCents,
  };
}
