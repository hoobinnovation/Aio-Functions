import { InsuranceOrder } from '../../../../../entities/InsuranceOrder';
import { InsuranceItem } from '../../../../../entities/InsuranceItem';
import { InsuranceFile } from '../../../../../entities/InsuranceFile';
import { InsuranceStatusEvent } from '../../../../../entities/InsuranceStatusEvent';
import { MediaAsset } from '../../../../../entities/MediaAsset';
import { deterministicId, strNum, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';

export async function seedInsurance(ctx: SeedContext, summary: SeedSummary) {
  const { manager, storeId, demoUids, sizes } = ctx;
  const insuranceOrders = Math.max(1, sizes.insuranceOrders);
  for (let i = 0; i < insuranceOrders; i += 1) {
    const insuranceOrderId = deterministicId('insorder', i + 1);
    const insuranceMediaId = deterministicId('insmedia', i + 1);

    await upsertById(manager, InsuranceOrder, 'InsuranceOrder', {
      id: insuranceOrderId,
      storeId,
      uid: demoUids.clientUid,
      status: 'submitted',
      quoteLocked: false,
      deliveryCentsX2Applied: false,
    }, summary);

    await upsertById(manager, InsuranceItem, 'InsuranceItem', {
      id: deterministicId('insitem', i + 1),
      insuranceOrderId,
      name: 'Damaged Product',
      qty: 1,
      clientContributionCents: strNum(500),
      companyContributionCents: strNum(700),
    }, summary);

    await upsertById(manager, MediaAsset, 'MediaAsset', {
      id: insuranceMediaId,
      storeId,
      ownerType: 'insurance_order',
      ownerId: insuranceOrderId,
      kind: 'image',
      originalPath: `dev/${storeId}/insurance/${insuranceOrderId}/damage.jpg`,
      thumbnailPath: `dev/${storeId}/insurance/${insuranceOrderId}/damage_thumb.jpg`,
      contentType: 'image/jpeg',
      sizeBytes: strNum(84000),
      status: 'ready',
      createdByUid: demoUids.clientUid,
    }, summary);

    await upsertById(manager, InsuranceFile, 'InsuranceFile', {
      id: deterministicId('insfile', i + 1),
      insuranceOrderId,
      type: 'damage_photo',
      mediaAssetId: insuranceMediaId,
    }, summary);

    await upsertById(manager, InsuranceStatusEvent, 'InsuranceStatusEvent', {
      id: deterministicId('insev', i + 1),
      insuranceOrderId,
      status: 'submitted',
      note: 'Seeded insurance submission',
      createdByUid: demoUids.clientUid,
    }, summary);
  }
}
