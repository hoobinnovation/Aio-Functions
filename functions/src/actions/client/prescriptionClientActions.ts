import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { ensureUserProfileForUid, requireAccountIdentity } from '../../core/identity';
import { normalizeListQueryInput } from '../../utils/queryNormalization';
import { PrescriptionRequest } from '../../entities/PrescriptionRequest';
import { PrescriptionRequestFile } from '../../entities/PrescriptionRequestFile';
import {
  PRESCRIPTION_STATUSES,
  appendPrescriptionStatusEvent,
  assertPrescriptionCustomerMutable,
  buildPrescriptionRequestDto,
  getPrescriptionWhatsAppContact,
  requirePrescriptionRequestForUser,
} from '../../core/prescriptions';

export async function prescriptionCreateDraft(ctx: ActionContext, payload: any = {}) {
  const userId = requireAccountIdentity(ctx);
  const profile = await ctx.db.transaction(async (tx: EntityManager) => ensureUserProfileForUid(tx, userId));
  const id = uuidv4();

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(PrescriptionRequest).save(
      tx.getRepository(PrescriptionRequest).create({
        id,
        storeId: ctx.storeId!,
        userId,
        customerName: payload.customerName ?? profile.displayName ?? null,
        customerPhone: payload.customerPhone ?? profile.phone ?? null,
        customerWhatsAppPhone: payload.customerWhatsAppPhone ?? profile.phone ?? null,
        notes: payload.notes ?? null,
        status: PRESCRIPTION_STATUSES.draft,
        statusMessage: 'تم إنشاء مسودة طلب الروشتة',
        rejectionReason: null,
        reviewNotes: null,
        linkedOrderId: null,
        reviewedByAdminId: null,
        reviewedAt: null,
        submittedAt: null,
      })
    );
    await appendPrescriptionStatusEvent(tx, id, null, PRESCRIPTION_STATUSES.draft, 'customer', userId, 'draft created');
  });

  return buildPrescriptionRequestDto(ctx, id);
}

export async function prescriptionAttachFiles(ctx: ActionContext, payload: any) {
  const userId = requireAccountIdentity(ctx);
  const request = await requirePrescriptionRequestForUser(ctx, payload.prescriptionRequestId, userId);
  assertPrescriptionCustomerMutable(request);

  const files = Array.isArray(payload.files) ? payload.files : [];
  if (!files.length) {
    throw new AppError('VALIDATION_ERROR', 'At least one prescription file is required');
  }

  await ctx.db.transaction(async (tx: EntityManager) => {
    const existingCount = await tx.getRepository(PrescriptionRequestFile).count({
      where: { prescriptionRequestId: request.id },
    });

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index] || {};
      await tx.getRepository(PrescriptionRequestFile).save(
        tx.getRepository(PrescriptionRequestFile).create({
          id: uuidv4(),
          prescriptionRequestId: request.id,
          mediaAssetId: file.mediaAssetId,
          kind: file.kind || 'prescription_image',
          sortOrder: Number(file.sortOrder ?? existingCount + index),
        })
      );
    }
  });

  return buildPrescriptionRequestDto(ctx, request.id);
}

export async function prescriptionSubmit(ctx: ActionContext, payload: any) {
  const userId = requireAccountIdentity(ctx);
  const request = await requirePrescriptionRequestForUser(ctx, payload.prescriptionRequestId, userId);
  if (request.status !== PRESCRIPTION_STATUSES.draft) {
    throw new AppError('VALIDATION_ERROR', 'Prescription request is already submitted');
  }

  const filesCount = await ctx.db.getRepository(PrescriptionRequestFile).count({ where: { prescriptionRequestId: request.id } });
  if (!filesCount) {
    throw new AppError('VALIDATION_ERROR', 'Prescription request must include at least one image');
  }

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(PrescriptionRequest).update(
      { id: request.id },
      {
        customerName: payload.customerName ?? request.customerName ?? null,
        customerPhone: payload.customerPhone ?? request.customerPhone ?? null,
        customerWhatsAppPhone: payload.customerWhatsAppPhone ?? request.customerWhatsAppPhone ?? request.customerPhone ?? null,
        notes: payload.notes ?? request.notes ?? null,
        status: PRESCRIPTION_STATUSES.submitted,
        statusMessage: 'تم استلام طلب الروشتة وبانتظار المراجعة',
        submittedAt: new Date(),
      }
    );
    await appendPrescriptionStatusEvent(tx, request.id, request.status, PRESCRIPTION_STATUSES.submitted, 'customer', userId, payload.notes ?? null);
  });

  return buildPrescriptionRequestDto(ctx, request.id);
}

export async function prescriptionGet(ctx: ActionContext, payload: any) {
  const userId = requireAccountIdentity(ctx);
  await requirePrescriptionRequestForUser(ctx, payload.prescriptionRequestId, userId);
  return buildPrescriptionRequestDto(ctx, payload.prescriptionRequestId);
}

export async function prescriptionListMine(ctx: ActionContext, payload: any = {}) {
  const userId = requireAccountIdentity(ctx);
  const q = normalizeListQueryInput(payload, { defaultPageSize: 20, maxPageSize: 100 });
  const where: any = { userId, storeId: ctx.storeId! };
  if (payload?.status) where.status = payload.status;

  const requests = await ctx.db.getRepository(PrescriptionRequest).find({
    where,
    order: { createdAt: 'DESC' as any },
    take: q.limit,
    skip: q.offset,
  });

  return { requests };
}

export async function prescriptionCancel(ctx: ActionContext, payload: any) {
  const userId = requireAccountIdentity(ctx);
  const request = await requirePrescriptionRequestForUser(ctx, payload.prescriptionRequestId, userId);
  assertPrescriptionCustomerMutable(request);

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(PrescriptionRequest).update(
      { id: request.id },
      {
        status: PRESCRIPTION_STATUSES.cancelled,
        statusMessage: payload.reason || 'تم إلغاء الطلب من العميل',
      }
    );
    await appendPrescriptionStatusEvent(tx, request.id, request.status, PRESCRIPTION_STATUSES.cancelled, 'customer', userId, payload.reason ?? null);
  });

  return buildPrescriptionRequestDto(ctx, request.id);
}

export async function prescriptionGetWhatsAppContact(ctx: ActionContext) {
  const whatsappContact = await getPrescriptionWhatsAppContact(ctx.db, ctx.storeId!);
  return { whatsappContact };
}
