import { EntityManager } from 'typeorm';
import { UserProfile } from '../../entities/UserProfile';

const adminSdk = require('firebase-admin') as any;

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function resolveDisplayNameInput(payload: any, fallback: string | null = null): string | null {
  return (
    normalizeOptionalString(payload?.displayName) ??
    normalizeOptionalString(payload?.fullName) ??
    normalizeOptionalString(payload?.name) ??
    fallback
  );
}

export function presentUserProfile<T extends UserProfile | null | undefined>(profile: T) {
  if (!profile) return null;

  return {
    ...profile,
    name: profile.displayName ?? null,
    fullName: profile.displayName ?? null,
  };
}

export async function enrichProfileFromAuthRecord(
  tx: EntityManager,
  uid: string,
  profile: UserProfile,
): Promise<UserProfile> {
  let userRecord: any = null;

  try {
    userRecord = await adminSdk.auth().getUser(uid);
  } catch (error: any) {
    if (String(error?.code || '') === 'auth/user-not-found') {
      return profile;
    }
    throw error;
  }

  const patch: Partial<UserProfile> = {};

  if (!profile.displayName) {
    patch.displayName = normalizeOptionalString(userRecord?.displayName);
  }
  if (!profile.email) {
    patch.email = normalizeOptionalString(userRecord?.email);
  }
  if (!profile.phone) {
    patch.phone = normalizeOptionalString(userRecord?.phoneNumber);
  }

  const hasPatch = Object.values(patch).some((value) => value != null);
  if (!hasPatch) {
    return profile;
  }

  await tx.getRepository(UserProfile).update({ uid }, patch);
  return tx.getRepository(UserProfile).findOneByOrFail({ uid });
}
