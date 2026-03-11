import { EntityManager } from 'typeorm';
import { AppError } from '../errors';
import { AuthPhonePasswordCredential } from '../../entities/AuthPhonePasswordCredential';

const adminSdk = require('firebase-admin') as any;

export interface ProviderStateSnapshot {
  hasPhonePassword: boolean;
  hasGoogle: boolean;
  hasFacebook: boolean;
  providerKeys: string[];
}

export async function buildProviderStateSnapshot(tx: EntityManager, uid: string): Promise<ProviderStateSnapshot> {
  try {
    const credential = await tx.getRepository(AuthPhonePasswordCredential).findOneBy({ uid, status: 'active' });
    const userRecord = await adminSdk.auth().getUser(uid);
    const providerIds = new Set<string>(
      Array.isArray(userRecord?.providerData)
        ? userRecord.providerData
            .map((provider: any) => (typeof provider?.providerId === 'string' ? provider.providerId : null))
            .filter((providerId: string | null): providerId is string => !!providerId)
        : [],
    );

    const providerKeys: string[] = [];
    if (credential) providerKeys.push('phonePassword');
    if (providerIds.has('google.com')) providerKeys.push('google');
    if (providerIds.has('facebook.com')) providerKeys.push('facebook');

    return {
      hasPhonePassword: !!credential,
      hasGoogle: providerIds.has('google.com'),
      hasFacebook: providerIds.has('facebook.com'),
      providerKeys,
    };
  } catch (error: any) {
    throw new AppError('PROVIDER_STATE_UNAVAILABLE', 'Unable to resolve provider state', {
      reason: error?.message ?? String(error),
    });
  }
}
