import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../../db/data-source';
import { PaymentSettingEntity } from '../../db/entities/PaymentSettingEntity';
import { writeAudit } from '../../lib/audit';
import { verifyAdminRole, verifyFirebaseUser, verifyStoreAccess } from '../../lib/auth';
import { mapError } from '../../lib/errors';
import { uuidSchema, validatePayload } from '../../lib/validators';

const ensureAccess = async (uid: string, storeId: string): Promise<void> => {
  await verifyAdminRole(uid, ['SUPER_ADMIN', 'STORE_ADMIN']);
  await verifyStoreAccess(uid, storeId);
};

export const adminPaymentSettingsGet = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), provider: Joi.string().trim().default('generic') }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAccess(uid, payload.storeId);

    const repo = (await getDataSource()).getRepository(PaymentSettingEntity);
    let setting = await repo.findOne({ where: { storeId: payload.storeId, provider: payload.provider } });
    if (!setting) {
      setting = await repo.save(repo.create({ storeId: payload.storeId, provider: payload.provider, isActive: true, config: {} }));
    }

    return { setting };
  } catch (error) { mapError(error); }
});

export const adminPaymentSettingsUpdate = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), provider: Joi.string().trim().default('generic'), isActive: Joi.boolean().optional(), config: Joi.object().unknown(true).optional() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAccess(uid, payload.storeId);

    const repo = (await getDataSource()).getRepository(PaymentSettingEntity);
    let setting = await repo.findOne({ where: { storeId: payload.storeId, provider: payload.provider } });
    if (!setting) setting = repo.create({ storeId: payload.storeId, provider: payload.provider, isActive: true, config: {} });

    if (payload.isActive !== undefined) setting.isActive = payload.isActive;
    if (payload.config !== undefined) setting.config = payload.config;

    setting = await repo.save(setting);
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.payment_settings.update', targetType: 'payment_settings', targetId: setting.id, storeId: setting.storeId });

    return { setting };
  } catch (error) { mapError(error); }
});
