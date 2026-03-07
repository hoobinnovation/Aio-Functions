import { Governorate } from '../../../../../entities/Governorate';
import { DeliveryZone } from '../../../../../entities/DeliveryZone';
import { ShippingMethod } from '../../../../../entities/ShippingMethod';
import { deterministicId, strNum, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';

export async function seedDeliveryZonesAndShipping(ctx: SeedContext, summary: SeedSummary) {
  const { manager, storeId } = ctx;
  await upsertById(manager, Governorate, 'Governorate', {
    id: deterministicId('gov', 1),
    name: 'Demo Governorate',
    status: 'active',
  }, summary);

  await upsertById(manager, DeliveryZone, 'DeliveryZone', {
    id: deterministicId('zone', 1),
    storeId,
    governorateId: deterministicId('gov', 1),
    name: 'Central Zone',
    lat: '30.0444200',
    lng: '31.2357100',
    priceCents: strNum(500),
    status: 'active',
  }, summary);

  await upsertById(manager, ShippingMethod, 'ShippingMethod', {
    id: deterministicId('ship', 1),
    storeId,
    name: 'Standard',
    basePriceCents: strNum(500),
    status: 'active',
  }, summary);
}
