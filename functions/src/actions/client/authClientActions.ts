import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { UserProfile } from '../../entities/UserProfile';
import { AuthPhonePasswordCredential } from '../../entities/AuthPhonePasswordCredential';
import { requireAccountIdentity, requireSessionIdentity } from '../../core/identity';
import { buildProviderStateSnapshot } from '../../core/auth/providerState';
import { hashPassword, normalizePhoneNumberOrThrow, validatePasswordStrengthOrThrow, verifyPassword } from '../../core/auth/phonePassword';
import { mergeGuestState } from '../../core/auth/guestMerge';
import { enrichProfileFromAuthRecord, presentUserProfile, resolveDisplayNameInput } from '../../core/auth/profileShape';

const adminSdk = require('firebase-admin') as any;

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

async function upsertProfileForIntentionalAuth(tx: EntityManager, uid: string, payload: any, normalizedPhone: string) {
  const repo = tx.getRepository(UserProfile);
  const existing = await repo.findOneBy({ uid });

  const profilePatch: Partial<UserProfile> = {
    displayName: resolveDisplayNameInput(payload, existing?.displayName ?? null),
    phone: normalizeOptionalString(payload?.phone) ?? normalizedPhone,
    email: normalizeOptionalString(payload?.email) ?? existing?.email ?? null,
    locale: normalizeOptionalString(payload?.locale) ?? existing?.locale ?? null,
    marketingOptIn: payload?.marketingOptIn === undefined ? (existing?.marketingOptIn ?? false) : !!payload.marketingOptIn,
    status: existing?.status === 'deleted_pending' ? 'active' : (existing?.status ?? 'active'),
  };

  await repo.upsert({ uid, ...profilePatch }, ['uid']);
  const profile = await repo.findOneByOrFail({ uid });
  return enrichProfileFromAuthRecord(tx, uid, profile);
}

export async function authPhonePasswordRegister(ctx: ActionContext, payload: any) {
  const uid = requireSessionIdentity(ctx);
  const { normalized, display } = normalizePhoneNumberOrThrow(payload?.phone);
  const password = validatePasswordStrengthOrThrow(payload?.password);
  const { passwordHash, passwordSalt } = await hashPassword(password);

  const profile = await ctx.db.transaction(async (tx: EntityManager) => {
    const existingPhone = await tx.getRepository(AuthPhonePasswordCredential).findOneBy({ phoneNormalized: normalized });
    if (existingPhone && existingPhone.uid !== uid) {
      throw new AppError('PHONE_ALREADY_IN_USE', 'Phone number is already in use');
    }

    await tx.getRepository(AuthPhonePasswordCredential).upsert({
      id: existingPhone?.id ?? uuidv4(),
      uid,
      phoneNormalized: normalized,
      phoneDisplay: display,
      passwordHash,
      passwordSalt,
      status: 'active',
    }, ['uid']);

    return upsertProfileForIntentionalAuth(tx, uid, payload, normalized);
  });

  const providers = await ctx.db.transaction(async (tx: EntityManager) => buildProviderStateSnapshot(tx, uid));
    let customToken: string | null = null;

    try {
        customToken = await adminSdk.auth().createCustomToken(uid);
    } catch (error: any) {
        throw new AppError('CREATE_CUSTOM_TOKEN_FAILED',
            error?.code +'::'+error?.message + '?uid:'+uid
        );
    }

  return {
    customToken,
    firebaseCustomToken:customToken,
    profile: presentUserProfile(profile),
    providers,
    identityType: 'authenticatedCustomer',
    upgradeMode: 'sameUidUpgrade',
  };
}

export async function authPhonePasswordLogin(ctx: ActionContext, payload: any) {
  const sessionUid = requireSessionIdentity(ctx);
  const { normalized } = normalizePhoneNumberOrThrow(payload?.phone);
  const password = validatePasswordStrengthOrThrow(payload?.password);

  const credential = await ctx.db.getRepository(AuthPhonePasswordCredential).findOneBy({ phoneNormalized: normalized, status: 'active' });
  if (!credential) {
    throw new AppError('INVALID_PHONE_PASSWORD_CREDENTIALS', 'Invalid phone or password');
  }

  const matched = await verifyPassword(password, credential.passwordSalt, credential.passwordHash);
  if (!matched) {
    throw new AppError('INVALID_PHONE_PASSWORD_CREDENTIALS', 'Invalid phone or password');
  }

  const targetUid = credential.uid;
  let mergedGuestState = false;
  let profile: UserProfile;

  await ctx.db.transaction(async (tx: EntityManager) => {
    if (ctx.auth?.isAnonymous && sessionUid !== targetUid) {
      mergedGuestState = await mergeGuestState(tx, sessionUid, targetUid);
    }
    const existingProfile = await tx.getRepository(UserProfile).findOneBy({ uid: targetUid });
    if (!existingProfile) {
      await tx.getRepository(UserProfile).insert({ uid: targetUid, status: 'active' });
    }
    profile = await tx.getRepository(UserProfile).findOneByOrFail({ uid: targetUid });
  });

  const providers = await ctx.db.transaction(async (tx: EntityManager) => buildProviderStateSnapshot(tx, targetUid));
  const customToken = await adminSdk.auth().createCustomToken(targetUid);

  return {
    customToken,
    profile: presentUserProfile(profile!),
    providers,
    identityType: 'authenticatedCustomer',
    mergedGuestState,
    mergedFromUid: mergedGuestState ? sessionUid : null,
  };
}

export async function authProvidersGet(ctx: ActionContext) {
  const uid = requireSessionIdentity(ctx);
  const providers = await ctx.db.transaction(async (tx: EntityManager) => buildProviderStateSnapshot(tx, uid));
  return { providers };
}

export async function authSetPhonePassword(ctx: ActionContext, payload: any) {
  const uid = requireAccountIdentity(ctx);
  const { normalized, display } = normalizePhoneNumberOrThrow(payload?.phone);
  const password = validatePasswordStrengthOrThrow(payload?.password);
  const { passwordHash, passwordSalt } = await hashPassword(password);

  await ctx.db.transaction(async (tx: EntityManager) => {
    const existingByPhone = await tx.getRepository(AuthPhonePasswordCredential).findOneBy({ phoneNormalized: normalized });
    if (existingByPhone && existingByPhone.uid !== uid) {
      throw new AppError('PHONE_ALREADY_IN_USE', 'Phone number is already in use');
    }

    const existingByUid = await tx.getRepository(AuthPhonePasswordCredential).findOneBy({ uid });
    await tx.getRepository(AuthPhonePasswordCredential).upsert({
      id: existingByUid?.id ?? existingByPhone?.id ?? uuidv4(),
      uid,
      phoneNormalized: normalized,
      phoneDisplay: display,
      passwordHash,
      passwordSalt,
      status: 'active',
    }, ['uid']);

    const profile = await tx.getRepository(UserProfile).findOneBy({ uid });
    if (profile && !profile.phone) {
      await tx.getRepository(UserProfile).update({ uid }, { phone: normalized });
    }
  });

  const providers = await ctx.db.transaction(async (tx: EntityManager) => buildProviderStateSnapshot(tx, uid));
  return { providers, updated: true };
}
