import { MediaAsset } from '../../../../../entities/MediaAsset';
import { PrescriptionRequest } from '../../../../../entities/PrescriptionRequest';
import { PrescriptionRequestFile } from '../../../../../entities/PrescriptionRequestFile';
import { PrescriptionRequestItemDraft } from '../../../../../entities/PrescriptionRequestItemDraft';
import { PrescriptionRequestStatusEvent } from '../../../../../entities/PrescriptionRequestStatusEvent';
import { addSkip, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';
import { addDays, getAnyCustomers, getStoreProducts, getStoreVariants, scopedId } from './seedHelpers';

export async function seedPrescription(ctx: SeedContext, summary: SeedSummary) {
    const customers = await getAnyCustomers(ctx);
    const products = await getStoreProducts(ctx);
    const variants = await getStoreVariants(ctx);

    if (!customers.length || !products.length || !variants.length) {
        addSkip(summary, 'Prescription', `Missing users/catalog for storeId=${ctx.storeId}`);
        return;
    }

    const storeId = ctx.storeId!;
    const customer = customers[0];
    const requestId = scopedId(storeId, 'prescription', 1);
    const mediaId = scopedId(storeId, 'prescriptionMedia', 1);

    await upsertById(ctx.manager, PrescriptionRequest, 'PrescriptionRequest', {
        id: requestId,
        storeId,
        userId: customer.uid,
        customerName: customer.displayName ?? 'Prescription Customer',
        customerPhone: customer.phone ?? '+201000000010',
        customerWhatsAppPhone: customer.phone ?? '+201000000010',
        notes: 'Seed prescription request',
        status: 'approved',
        statusMessage: 'Approved and draft items prepared',
        rejectionReason: null,
        reviewNotes: 'Verified by pharmacist',
        linkedOrderId: null,
        reviewedByAdminId: ctx.demoUids.adminSupportUid,
        reviewedAt: addDays(ctx.now, -1),
        submittedAt: addDays(ctx.now, -2),
    }, summary);

    await upsertById(ctx.manager, MediaAsset, 'MediaAsset', {
        id: mediaId,
        storeId,
        ownerType: 'prescription_request',
        ownerId: requestId,
        kind: 'image',
        originalPath: `stores/${storeId}/prescriptions/${requestId}/rx-1.jpg`,
        thumbnailPath: null,
        contentType: 'image/jpeg',
        sizeBytes: '245760',
        status: 'ready',
        createdByUid: customer.uid,
    }, summary);

    await upsertById(ctx.manager, PrescriptionRequestFile, 'PrescriptionRequestFile', {
        id: scopedId(storeId, 'prescriptionFile', 1),
        prescriptionRequestId: requestId,
        mediaAssetId: mediaId,
        kind: 'prescription_image',
        sortOrder: 0,
    }, summary);

    for (let i = 0; i < Math.min(2, variants.length); i += 1) {
        await upsertById(ctx.manager, PrescriptionRequestItemDraft, 'PrescriptionRequestItemDraft', {
            id: scopedId(storeId, 'prescriptionDraft', i + 1),
            prescriptionRequestId: requestId,
            productId: products[i]?.id ?? products[0].id,
            variantId: variants[i].id,
            qty: i + 1,
            note: i === 0 ? 'Take after meal' : 'As directed',
        }, summary);
    }

    const statuses = [
        { fromStatus: null, toStatus: 'submitted', actorType: 'user', actorId: customer.uid, note: 'Seed submitted' },
        { fromStatus: 'submitted', toStatus: 'under_review', actorType: 'admin', actorId: ctx.demoUids.adminSupportUid, note: 'Seed review started' },
        { fromStatus: 'under_review', toStatus: 'approved', actorType: 'admin', actorId: ctx.demoUids.adminSupportUid, note: 'Seed approved' },
    ];

    for (let i = 0; i < statuses.length; i += 1) {
        await upsertById(ctx.manager, PrescriptionRequestStatusEvent, 'PrescriptionRequestStatusEvent', {
            id: scopedId(storeId, 'prescriptionStatus', i + 1),
            prescriptionRequestId: requestId,
            ...statuses[i],
        }, summary);
    }
}