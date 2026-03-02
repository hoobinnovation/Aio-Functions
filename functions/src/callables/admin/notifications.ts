import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../../db/data-source';
import { NotificationCampaignEntity } from '../../db/entities/NotificationCampaignEntity';
import { writeAudit } from '../../lib/audit';
import { verifyAdminRole, verifyFirebaseUser, verifyStoreAccess } from '../../lib/auth';
import { dispatchCampaign } from '../../lib/campaign';
import { mapError } from '../../lib/errors';
import { uuidSchema, validatePayload } from '../../lib/validators';

const ensureAdmin = async (uid: string, storeId: string) => {
  await verifyAdminRole(uid, ['SUPER_ADMIN', 'STORE_ADMIN', 'MARKETING']);
  await verifyStoreAccess(uid, storeId);
};

export const adminNotificationsSend = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({
      storeId: uuidSchema.required(),
      title: Joi.string().min(1).max(191).required(),
      body: Joi.string().min(1).max(500).required(),
      targetType: Joi.string().valid('all','segment','user').required(),
      targetSpec: Joi.object().unknown(true).required(),
      deepLinkType: Joi.string().allow(null, ''),
      deepLinkValue: Joi.string().allow(null, ''),
      scheduledAt: Joi.date().allow(null),
    }), request.data);

    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const repo = (await getDataSource()).getRepository(NotificationCampaignEntity);
    let campaign = await repo.save(repo.create({
      storeId: payload.storeId,
      createdByAdminUid: uid,
      title: payload.title,
      body: payload.body,
      targetType: payload.targetType,
      targetSpec: payload.targetSpec,
      deepLinkType: payload.deepLinkType || null,
      deepLinkValue: payload.deepLinkValue || null,
      scheduledAt: payload.scheduledAt ?? null,
      status: 'queued',
    }));

    if (!payload.scheduledAt) {
      campaign = await dispatchCampaign(campaign);
    }

    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin.notifications.send', targetType: 'notification_campaign', targetId: campaign.id, storeId: payload.storeId });

    return { campaign };
  } catch (error) { mapError(error); }
});

export const adminNotificationsList = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), page: Joi.number().integer().min(1).default(1), pageSize: Joi.number().integer().min(1).max(100).default(20) }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const repo = (await getDataSource()).getRepository(NotificationCampaignEntity);
    const [items, total] = await repo.findAndCount({ where: { storeId: payload.storeId }, order: { createdAt: 'DESC' }, skip: (payload.page - 1) * payload.pageSize, take: payload.pageSize });
    return { items, total };
  } catch (error) { mapError(error); }
});
