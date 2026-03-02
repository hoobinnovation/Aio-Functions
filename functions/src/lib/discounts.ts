import { Between, In } from 'typeorm';
import { getDataSource } from '../db/data-source';
import { CartItemEntity } from '../db/entities/CartItemEntity';
import { DiscountCampaignEntity } from '../db/entities/DiscountCampaignEntity';
import { OrderEntity } from '../db/entities/OrderEntity';
import { ProductEntity } from '../db/entities/ProductEntity';
import { UserAddressEntity } from '../db/entities/UserAddressEntity';
import { UserProfileEntity } from '../db/entities/UserProfileEntity';

type Item = { productId: string; qty: number; lineTotal: number };

const matchAudience = async (storeId: string, uid: string, audience: Record<string, unknown>): Promise<boolean> => {
  const ds = await getDataSource();
  const user = await ds.getRepository(UserProfileEntity).findOne({ where: { uid } });
  const address = await ds.getRepository(UserAddressEntity).findOne({ where: { uid, storeId } });

  if (audience.gender && user?.gender !== audience.gender) return false;
  if (audience.vip !== undefined && !!user?.isVip !== !!audience.vip) return false;

  const tags = (audience.tags as string[] | undefined) ?? [];
  if (tags.length) {
    const userTags = user?.tags ?? [];
    if (!tags.some((t) => userTags.includes(t))) return false;
  }

  const cities = (audience.cities as string[] | undefined) ?? [];
  if (cities.length && (!address || !cities.includes(address.city))) return false;

  const minOrders = Number(audience.minOrders ?? 0);
  if (minOrders > 0) {
    const count = await ds.getRepository(OrderEntity).count({ where: { storeId, uid } });
    if (count < minOrders) return false;
  }

  return true;
};

const discountAmountForCampaign = async (
  campaign: DiscountCampaignEntity,
  subtotal: number,
  items: Item[],
): Promise<number> => {
  const now = new Date();
  if (!campaign.isActive) return 0;
  if (campaign.startAt && campaign.startAt > now) return 0;
  if (campaign.endAt && campaign.endAt < now) return 0;
  if (campaign.minSubtotal && subtotal < Number(campaign.minSubtotal)) return 0;

  const applies = campaign.appliesToJson as { scope?: string; ids?: string[] };
  let base = subtotal;
  if (applies.scope === 'products') {
    const ids = applies.ids ?? [];
    base = items.filter((i) => ids.includes(i.productId)).reduce((s, i) => s + i.lineTotal, 0);
  } else if (applies.scope === 'categories') {
    const ids = applies.ids ?? [];
    if (!ids.length) return 0;
    const products = await (await getDataSource()).getRepository(ProductEntity).find({ where: { id: In(items.map((i) => i.productId)) } });
    const catMap = new Map(products.map((p) => [p.id, p.categoryId]));
    base = items.filter((i) => ids.includes(String(catMap.get(i.productId)))).reduce((s, i) => s + i.lineTotal, 0);
  }

  if (base <= 0) return 0;
  const raw = campaign.discountType === 'percent' ? (base * Number(campaign.value)) / 100 : Number(campaign.value);
  const limited = campaign.maxDiscount ? Math.min(raw, Number(campaign.maxDiscount)) : raw;
  return Math.max(0, Math.min(limited, base));
};

export const computeTargetedDiscount = async (input: {
  storeId: string;
  uid: string;
  items: Item[];
  subtotal: number;
}): Promise<{ targetedDiscountTotal: number; appliedCampaigns: Array<{ id: string; name: string; amount: number }> }> => {
  const ds = await getDataSource();
  const campaigns = await ds.getRepository(DiscountCampaignEntity).find({ where: { storeId: input.storeId, isActive: true }, order: { priority: 'DESC', createdAt: 'ASC' } });

  for (const campaign of campaigns) {
    const okAudience = await matchAudience(input.storeId, input.uid, campaign.audienceJson as Record<string, unknown>);
    if (!okAudience) continue;
    const amount = await discountAmountForCampaign(campaign, input.subtotal, input.items);
    if (amount > 0) {
      return {
        targetedDiscountTotal: amount,
        appliedCampaigns: [{ id: campaign.id, name: campaign.name, amount }],
      };
    }
  }

  return { targetedDiscountTotal: 0, appliedCampaigns: [] };
};

export const previewAudienceCount = async (storeId: string, audience: Record<string, unknown>): Promise<number> => {
  const ds = await getDataSource();
  const qb = ds.getRepository(UserProfileEntity).createQueryBuilder('u').where('1=1');

  if (audience.gender) qb.andWhere('u.gender = :gender', { gender: audience.gender });
  if (audience.vip !== undefined) qb.andWhere('u.isVip = :vip', { vip: !!audience.vip });

  const tags = (audience.tags as string[] | undefined) ?? [];
  if (tags.length) qb.andWhere('JSON_OVERLAPS(u.tags, :tags)', { tags: JSON.stringify(tags) });

  const minOrders = Number(audience.minOrders ?? 0);
  if (minOrders > 0) {
    qb.andWhere(
      `(SELECT COUNT(1) FROM orders o WHERE o.storeId = :storeId AND o.uid = u.uid) >= :minOrders`,
      { storeId, minOrders },
    );
  }

  return qb.getCount();
};
