import Joi from 'joi';
import { In } from 'typeorm';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../db/data-source';
import { CategoryEntity } from '../db/entities/CategoryEntity';
import { HomeSectionBannerEntity } from '../db/entities/HomeSectionBannerEntity';
import { HomeSectionEntity } from '../db/entities/HomeSectionEntity';
import { ProductEntity } from '../db/entities/ProductEntity';
import { mapError } from '../lib/errors';
import { uuidSchema, validatePayload } from '../lib/validators';

const resolveProducts = async (storeId: string, config: Record<string, unknown>) => {
  const source = String(config.dataSource ?? 'latest');
  const repo = (await getDataSource()).getRepository(ProductEntity);
  if (source === 'featured') return repo.find({ where: { storeId, isFeatured: true, isDisabled: false }, take: Number(config.limit ?? 10), order: { createdAt: 'DESC' } });
  if (source === 'category') return repo.find({ where: { storeId, categoryId: String(config.categoryId ?? ''), isDisabled: false }, take: Number(config.limit ?? 10), order: { createdAt: 'DESC' } });
  if (source === 'manual_products') return repo.find({ where: { storeId, id: In((config.productIds as string[] ?? [])), isDisabled: false } });
  return repo.find({ where: { storeId, isDisabled: false }, take: Number(config.limit ?? 10), order: { createdAt: 'DESC' } });
};

export const homeGetLayout = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required() }), request.data);
    const ds = await getDataSource();
    const sections = await ds.getRepository(HomeSectionEntity).find({ where: { storeId: payload.storeId, isActive: true }, order: { sortOrder: 'ASC' } });

    const result = [] as Array<Record<string, unknown>>;
    for (const section of sections) {
      const config = section.configJson ?? {};
      let items: unknown[] = [];
      if (section.type === 'categories_row') items = await ds.getRepository(CategoryEntity).find({ where: { storeId: payload.storeId, isDisabled: false }, order: { sortOrder: 'ASC' } });
      if (section.type === 'products_carousel' || section.type === 'products_grid') items = await resolveProducts(payload.storeId, config);
      if (section.type === 'banners' || section.type === 'single_banner') items = await ds.getRepository(HomeSectionBannerEntity).find({ where: { storeId: payload.storeId, sectionId: section.id, isActive: true }, order: { sortOrder: 'ASC' } });
      result.push({ ...section, items });
    }

    return { sections: result };
  } catch (error) { mapError(error); }
});
