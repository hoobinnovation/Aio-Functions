import Joi from 'joi';
import { getStorage } from 'firebase-admin/storage';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../db/data-source';
import { AdminStoreAccessEntity } from '../db/entities/AdminStoreAccessEntity';
import { InsuranceOrderEntity } from '../db/entities/InsuranceOrderEntity';
import { DeliveryZoneEntity } from '../db/entities/DeliveryZoneEntity';
import { InsuranceOrderItemEntity } from '../db/entities/InsuranceOrderItemEntity';
import { InsuranceQuoteEventEntity } from '../db/entities/InsuranceQuoteEventEntity';
import { UserAddressEntity } from '../db/entities/UserAddressEntity';
import { OrderTrackingEventEntity } from '../db/entities/OrderTrackingEventEntity';
import { verifyFirebaseUser } from '../lib/auth';
import { haversineKm } from '../lib/delivery';
import { failedPrecondition, mapError, notFound } from '../lib/errors';
import { attachOrderAttribution } from '../lib/marketing';
import { pushAndPersistNotifications } from '../lib/notify';
import { uuidSchema, validatePayload } from '../lib/validators';

const validateOwnedPath = (path: string, uid: string, orderId: string): void => {
  if (!path.startsWith(`insurance/${uid}/${orderId}/`)) {
    failedPrecondition('Invalid file path ownership.');
  }
};

const buildUploadSpec = async (uid: string, orderId: string): Promise<Record<string, unknown>> => {
  const bucket = getStorage().bucket();
  const expires = Date.now() + 1000 * 60 * 20;
  const cardPath = `insurance/${uid}/${orderId}/card.pdf`;
  const medicalPath = `insurance/${uid}/${orderId}/medical.pdf`;
  const [cardUploadUrl] = await bucket.file(cardPath).getSignedUrl({ version: 'v4', action: 'write', expires });
  const [medicalUploadUrl] = await bucket.file(medicalPath).getSignedUrl({ version: 'v4', action: 'write', expires });
  return {
    card: { path: cardPath, uploadUrl: cardUploadUrl, expiresAt: new Date(expires).toISOString() },
    medical: { path: medicalPath, uploadUrl: medicalUploadUrl, expiresAt: new Date(expires).toISOString() },
  };
};

const notifyStoreAdmins = async (storeId: string, title: string, body: string, deepLinkValue: string): Promise<void> => {
  const adminRows = await (await getDataSource()).getRepository(AdminStoreAccessEntity).find({ where: { storeId } });
  const uids = Array.from(new Set(adminRows.map((x) => x.adminUid)));
  if (!uids.length) return;
  await pushAndPersistNotifications({
    storeId,
    uids,
    type: 'system',
    title,
    body,
    deepLinkType: 'admin_insurance',
    deepLinkValue,
  });
};

export const insuranceCreateDraft = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        notes: Joi.string().allow('', null),
        addressId: uuidSchema.required(),
        sessionId: Joi.string().trim().max(128).allow('', null),
      }),
      request.data,
    );

    const ds = await getDataSource();
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const address = await qr.manager
        .getRepository(UserAddressEntity)
        .findOne({ where: { id: payload.addressId, uid, storeId: payload.storeId } });
      if (!address) notFound('Address not found.');
      if (!address.lat || !address.lng || !address.governorate) {
        failedPrecondition('Address must include lat/lng/governorate.');
      }

      const zones = await qr.manager.getRepository(DeliveryZoneEntity).find({ where: { storeId: payload.storeId, governorate: address.governorate, isActive: true } });
      if (!zones.length) notFound('No delivery zones configured for this governorate.');
      const ranked = zones
        .map((z) => ({ zone: z, distanceKm: haversineKm(Number(address.lat), Number(address.lng), Number(z.centerLat), Number(z.centerLng)) }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
      const quote = ranked[0];
      if (quote.zone.radiusKm !== null && quote.distanceKm > Number(quote.zone.radiusKm)) failedPrecondition('out_of_service');

      const orderRepo = qr.manager.getRepository(InsuranceOrderEntity);
      const order = await orderRepo.save(
        orderRepo.create({
          storeId: payload.storeId,
          uid,
          status: 'insurance_submitted',
          notes: payload.notes || null,
          addressSnapshot: address,
          deliveryZoneId: quote.zone.id,
          deliveryFee: (Number(quote.zone.fee) * 2).toFixed(2),
          subtotal: '0.00',
          total: (Number(quote.zone.fee) * 2).toFixed(2),
          quoteLocked: false,
        }),
      );

      await qr.manager.getRepository(InsuranceQuoteEventEntity).save(
        qr.manager.getRepository(InsuranceQuoteEventEntity).create({
          insuranceOrderId: order.id,
          actorType: 'user',
          actorUid: uid,
          action: 'insurance.create_draft',
          payload: { deliveryZoneId: quote.zone.id, baseFee: Number(quote.zone.fee), insuranceDeliveryFee: Number(quote.zone.fee) * 2 },
        }),
      );

      await attachOrderAttribution({
        manager: qr.manager,
        storeId: payload.storeId,
        orderId: order.id,
        insuranceOrderId: order.id,
        sessionId: payload.sessionId || undefined,
      });

      await qr.commitTransaction();
      const uploadSpec = await buildUploadSpec(uid, order.id);
      return { insuranceOrderId: order.id, uploadSpec };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  } catch (error) {
    mapError(error);
  }
});

export const insuranceAttachFiles = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        insuranceOrderId: uuidSchema.required(),
        cardPath: Joi.string().required(),
        medicalPath: Joi.string().required(),
      }),
      request.data,
    );

    validateOwnedPath(payload.cardPath, uid, payload.insuranceOrderId);
    validateOwnedPath(payload.medicalPath, uid, payload.insuranceOrderId);

    const repo = (await getDataSource()).getRepository(InsuranceOrderEntity);
    const row = await repo.findOne({ where: { id: payload.insuranceOrderId, storeId: payload.storeId, uid } });
    if (!row) notFound('Insurance order not found.');

    row.cardFilePath = payload.cardPath;
    row.medicalFilePath = payload.medicalPath;
    await repo.save(row);

    return { success: true };
  } catch (error) {
    mapError(error);
  }
});

export const insuranceSubmit = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), insuranceOrderId: uuidSchema.required() }), request.data);

    const ds = await getDataSource();
    const repo = ds.getRepository(InsuranceOrderEntity);
    const row = await repo.findOne({ where: { id: payload.insuranceOrderId, storeId: payload.storeId, uid } });
    if (!row) notFound('Insurance order not found.');
    if (!row.cardFilePath || !row.medicalFilePath) failedPrecondition('Both files are required.');

    const bucket = getStorage().bucket();
    const [cardExists] = await bucket.file(row.cardFilePath).exists();
    const [medicalExists] = await bucket.file(row.medicalFilePath).exists();
    if (!cardExists || !medicalExists) failedPrecondition('Uploaded files do not exist.');

    row.status = 'insurance_under_review';
    await repo.save(row);

    await ds.getRepository(InsuranceQuoteEventEntity).save(
      ds.getRepository(InsuranceQuoteEventEntity).create({
        insuranceOrderId: row.id,
        actorType: 'user',
        actorUid: uid,
        action: 'insurance.submit',
        payload: null,
      }),
    );

    await notifyStoreAdmins(payload.storeId, 'Insurance order submitted', `Insurance order ${row.id} needs review.`, row.id);
    return { success: true, status: row.status };
  } catch (error) {
    mapError(error);
  }
});

export const insuranceGet = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), insuranceOrderId: uuidSchema.required() }), request.data);

    const ds = await getDataSource();
    const order = await ds.getRepository(InsuranceOrderEntity).findOne({ where: { id: payload.insuranceOrderId, storeId: payload.storeId, uid } });
    if (!order) notFound('Insurance order not found.');
    const items = await ds.getRepository(InsuranceOrderItemEntity).find({ where: { insuranceOrderId: order.id, storeId: payload.storeId } });
    return { order, items };
  } catch (error) {
    mapError(error);
  }
});

export const insuranceApproveQuote = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), insuranceOrderId: uuidSchema.required() }), request.data);

    const ds = await getDataSource();
    const orderRepo = ds.getRepository(InsuranceOrderEntity);
    const row = await orderRepo.findOne({ where: { id: payload.insuranceOrderId, storeId: payload.storeId, uid } });
    if (!row) notFound('Insurance order not found.');
    if (row.status !== 'insurance_quote_ready') failedPrecondition('Quote is not ready for approval.');

    row.status = 'processing';
    await orderRepo.save(row);

    await ds.getRepository(InsuranceQuoteEventEntity).save(
      ds.getRepository(InsuranceQuoteEventEntity).create({
        insuranceOrderId: row.id,
        actorType: 'user',
        actorUid: uid,
        action: 'insurance.approve_quote',
        payload: null,
      }),
    );

    const trackingRepo = ds.getRepository(OrderTrackingEventEntity);
    await trackingRepo.save(
      trackingRepo.create({
        storeId: payload.storeId,
        orderId: row.id,
        type: 'system',
        status: 'processing',
        message: 'Insurance customer approved quote; moved to processing.',
      }),
    );

    await notifyStoreAdmins(payload.storeId, 'Insurance quote approved', `Customer approved insurance quote ${row.id}.`, row.id);
    return { success: true, status: row.status };
  } catch (error) {
    mapError(error);
  }
});

export const insuranceRejectQuote = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(
      Joi.object({ storeId: uuidSchema.required(), insuranceOrderId: uuidSchema.required(), reason: Joi.string().max(500).allow('', null) }),
      request.data,
    );

    const ds = await getDataSource();
    const orderRepo = ds.getRepository(InsuranceOrderEntity);
    const row = await orderRepo.findOne({ where: { id: payload.insuranceOrderId, storeId: payload.storeId, uid } });
    if (!row) notFound('Insurance order not found.');

    row.status = 'insurance_customer_rejected';
    await orderRepo.save(row);

    await ds.getRepository(InsuranceQuoteEventEntity).save(
      ds.getRepository(InsuranceQuoteEventEntity).create({
        insuranceOrderId: row.id,
        actorType: 'user',
        actorUid: uid,
        action: 'insurance.reject_quote',
        payload: payload.reason ? { reason: payload.reason } : null,
      }),
    );

    await notifyStoreAdmins(payload.storeId, 'Insurance quote rejected', `Customer rejected insurance quote ${row.id}.`, row.id);
    return { success: true, status: row.status };
  } catch (error) {
    mapError(error);
  }
});
