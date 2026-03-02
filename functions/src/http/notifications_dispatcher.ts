import { onSchedule } from 'firebase-functions/v2/scheduler';
import { LessThanOrEqual } from 'typeorm';
import { getDataSource } from '../db/data-source';
import { NotificationCampaignEntity } from '../db/entities/NotificationCampaignEntity';
import { dispatchCampaign } from '../lib/campaign';

export const notificationsDispatcher = onSchedule('every 1 minutes', async () => {
  const ds = await getDataSource();
  const repo = ds.getRepository(NotificationCampaignEntity);
  const due = await repo.find({ where: { status: 'queued', scheduledAt: LessThanOrEqual(new Date()) }, take: 20, order: { scheduledAt: 'ASC' } });

  for (const campaign of due) {
    await dispatchCampaign(campaign);
  }
});
