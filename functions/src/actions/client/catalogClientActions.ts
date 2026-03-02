import { v4 as uuidv4 } from 'uuid';
import { EntityManager } from 'typeorm';
import { ActionContext } from '../../core/protocol';
import { HomeSection } from '../../entities/HomeSection';
import { UserProductFavorite } from '../../entities/UserProductFavorite';
import { UserStoreFavorite } from '../../entities/UserStoreFavorite';

export async function homeGetLayout(ctx: ActionContext) {
  const rows = await ctx.db.getRepository(HomeSection).find({ where: { storeId: ctx.storeId, enabled: true }, order: { sortOrder: 'ASC' as any } });
  return { sections: rows };
}

export async function productFavoritesList(ctx: ActionContext) {
  const rows = await ctx.db.getRepository(UserProductFavorite).find({ where: { uid: ctx.uid! }, order: { createdAt: 'DESC' as any } });
  return { favorites: rows };
}

export async function productFavoritesToggle(ctx: ActionContext, payload: any) {
  const repo = ctx.db.getRepository(UserProductFavorite);
  const existing = await repo.findOneBy({ uid: ctx.uid!, productId: payload.productId });
  if (existing) {
    await ctx.db.transaction(async (tx: EntityManager) => {
      await tx.getRepository(UserProductFavorite).delete({ id: existing.id });
    });
    return { favorited: false };
  }
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(UserProductFavorite).save(tx.getRepository(UserProductFavorite).create({ id: uuidv4(), uid: ctx.uid!, productId: payload.productId }));
  });
  return { favorited: true };
}

export async function storeFavoritesList(ctx: ActionContext) {
  const rows = await ctx.db.getRepository(UserStoreFavorite).find({ where: { uid: ctx.uid! }, order: { createdAt: 'DESC' as any } });
  return { favorites: rows };
}

export async function storeFavoritesToggle(ctx: ActionContext, payload: any) {
  const repo = ctx.db.getRepository(UserStoreFavorite);
  const existing = await repo.findOneBy({ uid: ctx.uid!, storeId: payload.storeId });
  if (existing) {
    await ctx.db.transaction(async (tx: EntityManager) => {
      await tx.getRepository(UserStoreFavorite).delete({ id: existing.id });
    });
    return { favorited: false };
  }
  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(UserStoreFavorite).save(tx.getRepository(UserStoreFavorite).create({ id: uuidv4(), uid: ctx.uid!, storeId: payload.storeId }));
  });
  return { favorited: true };
}
