import { getDataSource } from '../db/data-source';
import { DeliveryZoneEntity } from '../db/entities/DeliveryZoneEntity';
import { failedPrecondition, notFound } from './errors';

const toRad = (v: number): number => (v * Math.PI) / 180;

export const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const quoteDeliveryByNearestZone = async (input: {
  storeId: string;
  addressLat: number;
  addressLng: number;
  governorate: string;
}): Promise<{ zone: DeliveryZoneEntity; distanceKm: number; fee: number }> => {
  const zones = await (await getDataSource()).getRepository(DeliveryZoneEntity).find({
    where: { storeId: input.storeId, governorate: input.governorate, isActive: true },
  });
  if (!zones.length) notFound('No delivery zones configured for this governorate.');

  const ranked = zones
    .map((zone) => ({
      zone,
      distanceKm: haversineKm(input.addressLat, input.addressLng, Number(zone.centerLat), Number(zone.centerLng)),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const best = ranked[0];
  if (best.zone.radiusKm !== null && best.distanceKm > Number(best.zone.radiusKm)) {
    failedPrecondition('out_of_service');
  }

  return { zone: best.zone, distanceKm: best.distanceKm, fee: Number(best.zone.fee) };
};
