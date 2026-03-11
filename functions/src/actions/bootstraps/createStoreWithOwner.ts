import * as admin from 'firebase-admin';
import {onRequest} from 'firebase-functions/v2/https';

import { EntityManager } from 'typeorm';
import { getInitializedDataSource} from "../../core/db";
import {Store} from "../../entities/Store";
import {StoreSettings} from "../../entities/StoreSettings";
import {AdminUser} from "../../entities/AdminUser";
import {AdminRole} from "../../entities/AdminRole";
import {AdminStoreAccess} from "../../entities/AdminStoreAccess";
import {UserProfile} from "../../entities/UserProfile";

const BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET || 'xyz';

function json(res: any, status: number, payload: any) {
    res.status(status).json(payload);
}

function getHeader(req: any, key: string) {
    return req.get(key) || req.headers[key.toLowerCase()] || '';
}

export const bootstrapCreateStoreWithOwner = onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
    }

    const secret = getHeader(req, 'x-bootstrap-secret');
    if (!BOOTSTRAP_SECRET || secret !== BOOTSTRAP_SECRET) {
        return json(res, 403, { ok: false, error: 'FORBIDDEN' });
    }

    const payload = req.body || {};
    const owner = payload.owner || {};

    if (!payload.storeId || !payload.name || !owner.email || !owner.password) {
        return json(res, 400, {
            ok: false,
            error: 'VALIDATION_ERROR',
            message: 'storeId, name, owner.email, owner.password are required'
        });
    }

    const db = await getInitializedDataSource(false)

    const existingStore = await db.getRepository(Store).findOneBy({ id: String(payload.storeId) });
    if (existingStore) {
        return json(res, 409, { ok: false, error: 'STORE_ALREADY_EXISTS' });
    }
    const existingUser = await admin.auth().getUserByEmail(owner.email).catch(() => null);
    if (existingUser) {
        return json(res, 409, { ok: false, error: 'OWNER_EMAIL_ALREADY_EXISTS' });
    }

    let createdAuthUser: admin.auth.UserRecord | null = null;

    try {
        createdAuthUser = await admin.auth().createUser({
            email: owner.email,
            password: owner.password,
            displayName: owner.displayName || payload.name,
            phoneNumber: owner.phone || undefined,
            emailVerified: false,
            disabled: false
        });

        await db.transaction(async (tx: EntityManager) => {
            await tx.getRepository(Store).save(
                tx.getRepository(Store).create({
                    id: String(payload.storeId),
                    name: payload.name,
                    status: 'active',
                    disabledReason: null,
                    disabledAt: null,
                    disabledByUid: null
                })
            );

            await tx.getRepository(StoreSettings).save(
                tx.getRepository(StoreSettings).create({
                    storeId: String(payload.storeId),
                    currency: payload.currency || 'EGP',
                    taxMode: payload.taxMode || 'exclusive',
                    supportWhatsApp: payload.supportWhatsApp || null,
                    supportEmail: payload.supportEmail || owner.email || null,
                    pickupEnabled: payload.pickupEnabled ?? true,
                    deliveryEnabled: payload.deliveryEnabled ?? true,
                    featureVisibilityJson: null
                })
            );

            await tx.getRepository(AdminUser).save(
                tx.getRepository(AdminUser).create({
                    uid: createdAuthUser!.uid,
                    status: 'active'
                })
            );

            await tx.getRepository(AdminRole).save(
                tx.getRepository(AdminRole).create({
                    adminUid: createdAuthUser!.uid,
                    role: payload.ownerRole || 'superadmin'
                })
            );

            await tx.getRepository(AdminStoreAccess).save(
                tx.getRepository(AdminStoreAccess).create({
                    adminUid: createdAuthUser!.uid,
                    storeId: String(payload.storeId)
                })
            );

            const existingProfile = await tx.getRepository(UserProfile).findOneBy({ uid: createdAuthUser!.uid });
            if (!existingProfile) {
                await tx.getRepository(UserProfile).save(
                    tx.getRepository(UserProfile).create({
                        uid: createdAuthUser!.uid,
                        email: owner.email || null,
                        phone: owner.phone || null,
                        displayName: owner.displayName || payload.name || null,
                        locale: 'ar',
                        marketingOptIn: false,
                        status: 'active',
                        disabledReason: null,
                        disabledAt: null,
                        disabledByUid: null
                    })
                );
            }
        });

        await admin.auth().setCustomUserClaims(createdAuthUser.uid, {
            admin: true,
            role: payload.ownerRole || 'superadmin',
            storeId: String(payload.storeId),
            store_id: String(payload.storeId)
        });

        return json(res, 200, {
            ok: true,
            storeId: String(payload.storeId),
            storeName: payload.name,
            owner: {
                uid: createdAuthUser.uid,
                email: createdAuthUser.email || owner.email,
                displayName: createdAuthUser.displayName || owner.displayName || payload.name,
                phoneNumber: createdAuthUser.phoneNumber || owner.phone || null
            }
        });
    } catch (error: any) {
        if (createdAuthUser?.uid) {
            await admin.auth().deleteUser(createdAuthUser.uid).catch(() => null);
        }

        return json(res, 500, {
            ok: false,
            error: 'BOOTSTRAP_CREATE_STORE_FAILED',
            message: error?.message || 'Unknown error'
        });
    }
});
