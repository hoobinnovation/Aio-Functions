import { AuthPhonePasswordCredential } from '../../../../../entities/AuthPhonePasswordCredential';
import { EdgeIngestedEvent } from '../../../../../entities/EdgeIngestedEvent';
import { EdgeNode } from '../../../../../entities/EdgeNode';
import { UserAccountDeleteRequest } from '../../../../../entities/UserAccountDeleteRequest';
import { UserProfile } from '../../../../../entities/UserProfile';
import { addSkip, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';
import { getAnyCustomers, scopedId } from './seedHelpers';

export async function seedAuthAndEdge(ctx: SeedContext, summary: SeedSummary) {
    const users = await getAnyCustomers(ctx);
    if (!users.length) {
        addSkip(summary, 'AuthAndEdge', `No users found for storeId=${ctx.storeId}`);
        return;
    }

    const storeId = ctx.storeId!;
    const targetUsers = users.slice(0, Math.min(3, users.length));

    for (let i = 0; i < targetUsers.length; i += 1) {
        const user = targetUsers[i];
        await upsertById(ctx.manager, AuthPhonePasswordCredential, 'AuthPhonePasswordCredential', {
            id: scopedId(storeId, 'phoneCred', i + 1),
            uid: user.uid,
            phoneNormalized: `2010000000${i + 1}`,
            phoneDisplay: `+20 100 000 00${i + 1}`,
            passwordHash: `seed_hash_${i + 1}`,
            passwordSalt: `seed_salt_${i + 1}`,
            status: 'active',
        }, summary);
    }

    await upsertById(ctx.manager, EdgeNode, 'EdgeNode', {
        hubId: `hub_${storeId.slice(-8)}`,
        storeId,
        status: 'active',
        secretHash: `edge_secret_${storeId}`,
    }, summary);

    await upsertById(ctx.manager, EdgeIngestedEvent, 'EdgeIngestedEvent', {
        eventId: `edge_evt_${storeId}_1`,
        hubId: `hub_${storeId.slice(-8)}`,
        storeId,
        seq: '1',
        eventType: 'catalog.sync',
        createdAt: new Date(ctx.now.getTime() - 5 * 60 * 1000),
        appliedAt: ctx.now,
    }, summary);

    await upsertById(ctx.manager, EdgeIngestedEvent, 'EdgeIngestedEvent', {
        eventId: `edge_evt_${storeId}_2`,
        hubId: `hub_${storeId.slice(-8)}`,
        storeId,
        seq: '2',
        eventType: 'inventory.sync',
        createdAt: new Date(ctx.now.getTime() - 2 * 60 * 1000),
        appliedAt: ctx.now,
    }, summary);

    await upsertById(ctx.manager, UserAccountDeleteRequest, 'UserAccountDeleteRequest', {
        id: scopedId(storeId, 'deleteReq', 1),
        uid: targetUsers[0].uid,
        reason: 'Seed pending delete request',
        status: 'pending',
        requestedAt: new Date(ctx.now.getTime() - 24 * 60 * 60 * 1000),
        reviewedAt: null,
        reviewedByUid: null,
    }, summary);
}