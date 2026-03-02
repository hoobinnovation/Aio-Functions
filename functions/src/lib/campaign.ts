import { In } from 'typeorm';
import { getDataSource } from '../db/data-source';
import { NotificationCampaignEntity } from '../db/entities/NotificationCampaignEntity';
import { NotificationTokenEntity } from '../db/entities/NotificationTokenEntity';
import { pushAndPersistNotifications } from './notify';

export const resolveCampaignRecipients = async (campaign: NotificationCampaignEntity): Promise<string[]> => {
  const ds = await getDataSource();
  const tokenRepo = ds.getRepository(NotificationTokenEntity);

  if (campaign.targetType === 'user') {
    const uid = String((campaign.targetSpec as { uid?: string }).uid ?? '');
    return uid ? [uid] : [];
  }

  if (campaign.targetType === 'segment') {
    const uids = ((campaign.targetSpec as { uids?: string[] }).uids ?? []).filter(Boolean);
    return Array.from(new Set(uids));
  }

  const rows = await tokenRepo.find({ where: { storeId: campaign.storeId } });
  return Array.from(new Set(rows.map((r) => r.uid)));
};

export const dispatchCampaign = async (campaign: NotificationCampaignEntity): Promise<NotificationCampaignEntity> => {
  const ds = await getDataSource();
  const campaignRepo = ds.getRepository(NotificationCampaignEntity);

  const uids = await resolveCampaignRecipients(campaign);
  const result = await pushAndPersistNotifications({
    storeId: campaign.storeId,
    uids,
    type: 'offer',
    title: campaign.title,
    body: campaign.body,
    deepLinkType: campaign.deepLinkType,
    deepLinkValue: campaign.deepLinkValue,
  });

  campaign.sentCount = result.sent;
  campaign.failedCount = result.failed;
  if (result.failed > 0 && result.sent > 0) campaign.status = 'partial';
  else if (result.failed > 0) campaign.status = 'failed';
  else campaign.status = 'sent';

  return campaignRepo.save(campaign);
};
