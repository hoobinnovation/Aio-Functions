import { getMessaging } from 'firebase-admin/messaging';
import { In } from 'typeorm';
import { getDataSource } from '../db/data-source';
import { NotificationEntity } from '../db/entities/NotificationEntity';
import { NotificationTokenEntity } from '../db/entities/NotificationTokenEntity';

export const pushAndPersistNotifications = async (input: {
  storeId: string;
  uids: string[];
  type: 'order' | 'payment' | 'shipping' | 'offer' | 'system';
  title: string;
  body: string;
  deepLinkType?: string | null;
  deepLinkValue?: string | null;
}): Promise<{ sent: number; failed: number }> => {
  if (!input.uids.length) return { sent: 0, failed: 0 };

  const ds = await getDataSource();
  const notifRepo = ds.getRepository(NotificationEntity);
  const tokenRepo = ds.getRepository(NotificationTokenEntity);

  await notifRepo.save(
    input.uids.map((uid) =>
      notifRepo.create({
        storeId: input.storeId,
        uid,
        type: input.type,
        title: input.title,
        body: input.body,
        deepLinkType: input.deepLinkType ?? null,
        deepLinkValue: input.deepLinkValue ?? null,
        isRead: false,
      }),
    ),
  );

  const tokens = await tokenRepo.find({ where: { storeId: input.storeId, uid: In(input.uids) } });
  if (!tokens.length) return { sent: 0, failed: 0 };

  const messageTokens = tokens.map((t) => t.token);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < messageTokens.length; i += 500) {
    const batch = messageTokens.slice(i, i + 500);
    const res = await getMessaging().sendEachForMulticast({
      tokens: batch,
      notification: { title: input.title, body: input.body },
      data: {
        storeId: input.storeId,
        type: input.type,
        deepLinkType: input.deepLinkType ?? '',
        deepLinkValue: input.deepLinkValue ?? '',
      },
    });
    sent += res.successCount;
    failed += res.failureCount;
  }

  return { sent, failed };
};
