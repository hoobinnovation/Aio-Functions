import { EntityManager } from 'typeorm';
import { ActionContext } from './protocol';
import { AppError } from './errors';
import { UserProfile } from '../entities/UserProfile';
import { UserAddress } from '../entities/UserAddress';
import { v4 as uuidv4 } from 'uuid';

export function requireSessionIdentity(ctx: ActionContext): string {
  const uid = ctx.uid ?? ctx.auth?.uid;
  if (!uid) {
    throw new AppError('SESSION_IDENTITY_REQUIRED', 'Session identity is required');
  }
  return uid;
}

export function requireAccountIdentity(ctx: ActionContext): string {
  const uid = requireSessionIdentity(ctx);
  if (ctx.auth?.isAnonymous) {
    throw new AppError('ACCOUNT_AUTH_REQUIRED', 'Intentional account authentication is required');
  }
  return uid;
}

export async function ensureUserProfileForUid(tx: EntityManager, uid: string): Promise<UserProfile> {
  const repo = tx.getRepository(UserProfile);
  let profile = await repo.findOneBy({ uid });
  if (!profile) {
    profile = repo.create({ uid, status: 'active' });
    await repo.save(profile);
  }
  return profile;
}

export async function hydrateProfileFromCheckout(tx: EntityManager, uid: string, input: any): Promise<UserProfile> {
  const profile = await ensureUserProfileForUid(tx, uid);
  const displayName = typeof input?.displayName === 'string' ? input.displayName.trim() : '';
  const phone = typeof input?.phone === 'string' ? input.phone.trim() : '';

  if (!displayName || !phone || !input?.shippingAddress) {
    throw new AppError('CHECKOUT_CONTACT_REQUIRED', 'Checkout contact and shipping address are required');
  }

  await tx.getRepository(UserProfile).update(
    { uid },
    {
      displayName,
      phone,
      status: profile.status === 'deleted_pending' ? 'active' : profile.status,
    }
  );

  const addressRepo = tx.getRepository(UserAddress);
  const existingDefault = await addressRepo.findOneBy({ uid, isDefault: true });
  const shippingAddress = input.shippingAddress;
  const addressPayload = {
    uid,
    label: shippingAddress.label ?? 'Checkout',
    recipientName: displayName,
    phone,
    governorate: shippingAddress.governorate,
    city: shippingAddress.city,
    area: shippingAddress.area ?? null,
    street: shippingAddress.street,
    building: shippingAddress.building ?? null,
    floor: shippingAddress.floor ?? null,
    apartment: shippingAddress.apartment ?? null,
    landmark: shippingAddress.landmark ?? null,
    lat: String(shippingAddress.lat),
    lng: String(shippingAddress.lng),
    notes: shippingAddress.notes ?? null,
    isDefault: true,
  };

  if (existingDefault) {
    await addressRepo.update({ id: existingDefault.id, uid }, addressPayload);
  } else {
    const address = addressRepo.create({ id: uuidv4(), ...addressPayload });
    await addressRepo.save(address);
  }

  return tx.getRepository(UserProfile).findOneByOrFail({ uid });
}
