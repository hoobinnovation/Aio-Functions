import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../db/data-source';
import { ShippingMethodEntity } from '../db/entities/ShippingMethodEntity';
import { UserAddressEntity } from '../db/entities/UserAddressEntity';
import { verifyFirebaseUser } from '../lib/auth';
import { mapError, notFound } from '../lib/errors';
import { quoteDeliveryByNearestZone } from '../lib/delivery';
import { uuidSchema, validatePayload } from '../lib/validators';

const computeCost = (method: ShippingMethodEntity, address: UserAddressEntity): number => {
  if (method.type === 'pickup') return 0;
  if (method.type === 'flat') return Number(method.cost);

  const rules = (method.rules ?? {}) as { areas?: Array<{ area: string; cost: number }> };
  const match = rules.areas?.find((x) => x.area.toLowerCase() === address.area.toLowerCase());
  return match ? Number(match.cost) : Number(method.cost);
};

export const shippingListMethods = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), addressId: uuidSchema.required() }), request.data);

    const ds = await getDataSource();
    const address = await ds.getRepository(UserAddressEntity).findOne({ where: { id: payload.addressId, uid, storeId: payload.storeId } });
    if (!address) notFound('Address not found.');

    const methods = await ds.getRepository(ShippingMethodEntity).find({ where: { storeId: payload.storeId, isActive: true }, order: { createdAt: 'ASC' } });

    return {
      items: methods.map((method) => ({
        ...method,
        computedCost: computeCost(method, address),
      })),
    };
  } catch (error) {
    mapError(error);
  }
});


export const shippingQuoteDelivery = onCall(async (request) => {
  try {
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        addressLat: Joi.number().min(-90).max(90).required(),
        addressLng: Joi.number().min(-180).max(180).required(),
        governorate: Joi.string().trim().required(),
      }),
      request.data,
    );

    const quote = await quoteDeliveryByNearestZone(payload);
    return { zoneId: quote.zone.id, fee: quote.fee };
  } catch (error) {
    mapError(error);
  }
});
