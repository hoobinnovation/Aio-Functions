import { EntityManager } from 'typeorm';
import { Cart } from '../../entities/Cart';
import { CartItem } from '../../entities/CartItem';
import { UserStoreContext } from '../../entities/UserStoreContext';
import { UserProfile } from '../../entities/UserProfile';
import { UserAddress } from '../../entities/UserAddress';

function itemKey(productId: string, variantId: string | null) {
  return `${productId}::${variantId ?? ''}`;
}

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export async function mergeGuestState(tx: EntityManager, sourceUid: string, targetUid: string): Promise<boolean> {
  if (!sourceUid || !targetUid || sourceUid === targetUid) return false;

  let merged = false;

  const sourceCarts = await tx.getRepository(Cart).find({ where: { uid: sourceUid } });
  for (const sourceCart of sourceCarts) {
    let targetCart = await tx.getRepository(Cart).findOneBy({ uid: targetUid, storeId: sourceCart.storeId });

    if (!targetCart) {
      await tx.getRepository(Cart).update({ id: sourceCart.id }, { uid: targetUid });
      merged = true;
      continue;
    }

    if (!targetCart.couponCode && sourceCart.couponCode) {
      await tx.getRepository(Cart).update({ id: targetCart.id }, { couponCode: sourceCart.couponCode });
      targetCart = (await tx.getRepository(Cart).findOneBy({ id: targetCart.id })) ?? targetCart;
      merged = true;
    }

    const sourceItems = await tx.getRepository(CartItem).find({ where: { cartId: sourceCart.id } });
    const targetItems = await tx.getRepository(CartItem).find({ where: { cartId: targetCart.id } });
    const targetByKey = new Map<string, CartItem>(targetItems.map((item: CartItem) => [itemKey(item.productId, item.variantId), item] as const));

    for (const sourceItem of sourceItems) {
      const key = itemKey(sourceItem.productId, sourceItem.variantId);
      const existing = targetByKey.get(key);
      if (existing) {
        await tx.getRepository(CartItem).update({ id: existing.id }, { qty: existing.qty + sourceItem.qty });
        await tx.getRepository(CartItem).delete({ id: sourceItem.id });
      } else {
        await tx.getRepository(CartItem).update({ id: sourceItem.id }, { cartId: targetCart.id });
      }
      merged = true;
    }

    await tx.getRepository(Cart).delete({ id: sourceCart.id });
  }

  const sourceContext = await tx.getRepository(UserStoreContext).findOneBy({ uid: sourceUid });
  const targetContext = await tx.getRepository(UserStoreContext).findOneBy({ uid: targetUid });
  if (sourceContext && !targetContext) {
    await tx.getRepository(UserStoreContext).update({ uid: sourceUid }, { uid: targetUid });
    merged = true;
  } else if (sourceContext && targetContext) {
    await tx.getRepository(UserStoreContext).delete({ uid: sourceUid });
  }

  const sourceProfile = await tx.getRepository(UserProfile).findOneBy({ uid: sourceUid });
  const targetProfile = await tx.getRepository(UserProfile).findOneBy({ uid: targetUid });
  if (sourceProfile && targetProfile) {
    const profilePatch: Partial<UserProfile> = {};
    if (!hasValue(targetProfile.displayName) && hasValue(sourceProfile.displayName)) profilePatch.displayName = sourceProfile.displayName;
    if (!hasValue(targetProfile.phone) && hasValue(sourceProfile.phone)) profilePatch.phone = sourceProfile.phone;
    if (!hasValue(targetProfile.email) && hasValue(sourceProfile.email)) profilePatch.email = sourceProfile.email;
    if (!hasValue(targetProfile.locale) && hasValue(sourceProfile.locale)) profilePatch.locale = sourceProfile.locale;
    if (targetProfile.marketingOptIn !== true && sourceProfile.marketingOptIn === true) profilePatch.marketingOptIn = true;

    if (Object.keys(profilePatch).length > 0) {
      await tx.getRepository(UserProfile).update({ uid: targetUid }, profilePatch);
      merged = true;
    }
  }

  const targetDefaultAddress = await tx.getRepository(UserAddress).findOneBy({ uid: targetUid, isDefault: true });
  if (!targetDefaultAddress) {
    const sourceDefaultAddress = await tx.getRepository(UserAddress).findOneBy({ uid: sourceUid, isDefault: true });
    if (sourceDefaultAddress) {
      await tx.getRepository(UserAddress).update({ id: sourceDefaultAddress.id }, { uid: targetUid });
      merged = true;
    }
  }

  return merged;
}
