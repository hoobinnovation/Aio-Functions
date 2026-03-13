import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { normalizeListQueryInput, resolveStoreScopedId } from '../../utils/queryNormalization';
import { Order } from '../../entities/Order';
import { PrescriptionRequest } from '../../entities/PrescriptionRequest';
import {
  PRESCRIPTION_STATUSES,
  appendPrescriptionStatusEvent,
  assertPrescriptionStatusTransition,
  buildPrescriptionRequestDto,
  convertPrescriptionRequestToOrder,
  replacePrescriptionDraftItems,
  requirePrescriptionRequestForStore,
} from '../../core/prescriptions';

async function updatePrescriptionStatus(
  ctx: ActionContext,
  storeId: string,
  prescriptionRequestId: string,
  nextStatus: string,
  note?: string | null,
  extraUpdates: Partial<PrescriptionRequest> = {}
) {
  const request = await requirePrescriptionRequestForStore(ctx, prescriptionRequestId, storeId);
  assertPrescriptionStatusTransition(request.status, nextStatus as any);

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(PrescriptionRequest).update(
      { id: request.id, storeId },
      {
        status: nextStatus,
        statusMessage: note ?? extraUpdates.statusMessage ?? request.statusMessage ?? null,
        reviewNotes: extraUpdates.reviewNotes ?? request.reviewNotes ?? null,
        rejectionReason: extraUpdates.rejectionReason ?? request.rejectionReason ?? null,
        reviewedByAdminId: ctx.uid ?? request.reviewedByAdminId ?? null,
        reviewedAt: new Date(),
        ...extraUpdates,
      }
    );
    await appendPrescriptionStatusEvent(tx, request.id, request.status, nextStatus, 'admin', ctx.uid ?? null, note ?? null);
  });

  return buildPrescriptionRequestDto(ctx, request.id, storeId);
}

export async function adminPrescriptionList(ctx: ActionContext, payload: any = {}) {
  const q = normalizeListQueryInput(payload, { defaultPageSize: 50, maxPageSize: 200 });
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const where: any = { storeId };
  if (payload?.status) where.status = payload.status;
  const requests = await ctx.db.getRepository(PrescriptionRequest).find({
    where,
    order: { createdAt: 'DESC' as any },
    take: q.limit,
    skip: q.offset,
  });
  return { requests };
}

export async function adminPrescriptionGet(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  return buildPrescriptionRequestDto(ctx, payload.prescriptionRequestId, storeId);
}

export async function adminPrescriptionMarkUnderReview(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  return updatePrescriptionStatus(
    ctx,
    storeId,
    payload.prescriptionRequestId,
    PRESCRIPTION_STATUSES.underReview,
    payload.note || 'تم بدء مراجعة الروشتة',
    { reviewNotes: payload.note ?? null }
  );
}

export async function adminPrescriptionApprove(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const request = await requirePrescriptionRequestForStore(ctx, payload.prescriptionRequestId, storeId);
  const currentStatus = request.status === PRESCRIPTION_STATUSES.submitted ? PRESCRIPTION_STATUSES.underReview : request.status;

  if (request.status === PRESCRIPTION_STATUSES.submitted) {
    await ctx.db.transaction(async (tx: EntityManager) => {
      await tx.getRepository(PrescriptionRequest).update(
        { id: request.id },
        {
          status: PRESCRIPTION_STATUSES.underReview,
          statusMessage: 'الطلب تحت المراجعة',
          reviewNotes: payload.reviewNotes ?? null,
          reviewedByAdminId: ctx.uid ?? null,
          reviewedAt: new Date(),
        }
      );
      await appendPrescriptionStatusEvent(tx, request.id, request.status, PRESCRIPTION_STATUSES.underReview, 'admin', ctx.uid ?? null, payload.reviewNotes ?? 'under review');
    });
  }

  assertPrescriptionStatusTransition(currentStatus, PRESCRIPTION_STATUSES.approved);

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(PrescriptionRequest).update(
      { id: request.id, storeId },
      {
        status: PRESCRIPTION_STATUSES.approved,
        statusMessage: payload.note || 'تمت الموافقة على الروشتة',
        reviewNotes: payload.reviewNotes ?? payload.note ?? null,
        reviewedByAdminId: ctx.uid ?? null,
        reviewedAt: new Date(),
      }
    );
    await appendPrescriptionStatusEvent(tx, request.id, currentStatus, PRESCRIPTION_STATUSES.approved, 'admin', ctx.uid ?? null, payload.note ?? null);
  });

  return buildPrescriptionRequestDto(ctx, request.id, storeId);
}

export async function adminPrescriptionReject(ctx: ActionContext, payload: any) {
  if (!payload?.rejectionReason) {
    throw new AppError('VALIDATION_ERROR', 'rejectionReason is required');
  }
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  return updatePrescriptionStatus(
    ctx,
    storeId,
    payload.prescriptionRequestId,
    PRESCRIPTION_STATUSES.rejectedUnreadable,
    payload.note || payload.rejectionReason,
    {
      rejectionReason: payload.rejectionReason,
      reviewNotes: payload.note ?? null,
    }
  );
}

export async function adminPrescriptionSetItemsDraft(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const request = await requirePrescriptionRequestForStore(ctx, payload.prescriptionRequestId, storeId);
  if ([PRESCRIPTION_STATUSES.convertedToOrder, PRESCRIPTION_STATUSES.cancelled].includes(request.status as any)) {
    throw new AppError('VALIDATION_ERROR', 'Prescription request can no longer be edited');
  }

  await ctx.db.transaction(async (tx: EntityManager) => {
    await replacePrescriptionDraftItems(ctx, tx, request, payload.items || []);
    if (request.status === PRESCRIPTION_STATUSES.submitted) {
      await tx.getRepository(PrescriptionRequest).update(
        { id: request.id },
        {
          status: PRESCRIPTION_STATUSES.underReview,
          statusMessage: 'تم تحديث الأدوية المقترحة والطلب تحت المراجعة',
          reviewedByAdminId: ctx.uid ?? null,
          reviewedAt: new Date(),
        }
      );
      await appendPrescriptionStatusEvent(tx, request.id, request.status, PRESCRIPTION_STATUSES.underReview, 'admin', ctx.uid ?? null, 'items mapped');
    }
  });

  return buildPrescriptionRequestDto(ctx, request.id, storeId);
}

export async function adminPrescriptionConvertToOrder(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  return convertPrescriptionRequestToOrder(ctx, payload.prescriptionRequestId, ctx.uid ?? 'admin', storeId);
}

export async function adminPrescriptionLinkExistingOrder(ctx: ActionContext, payload: any) {
  const storeId = resolveStoreScopedId(ctx.storeId, payload.storeId);
  const request = await requirePrescriptionRequestForStore(ctx, payload.prescriptionRequestId, storeId);
  if (request.linkedOrderId) {
    throw new AppError('CONFLICT', 'Prescription request already linked to an order');
  }
  const order = await ctx.db.getRepository(Order).findOneBy({ id: payload.orderId, storeId });
  if (!order) throw new AppError('NOT_FOUND', 'Order not found');
  if (order.uid !== request.userId) {
    throw new AppError('FORBIDDEN', 'Order does not belong to prescription customer');
  }

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(PrescriptionRequest).update(
      { id: request.id, storeId },
      {
        linkedOrderId: order.id,
        status: PRESCRIPTION_STATUSES.convertedToOrder,
        statusMessage: 'تم ربط الروشتة بطلب موجود',
        reviewedByAdminId: ctx.uid ?? null,
        reviewedAt: new Date(),
      }
    );
    await appendPrescriptionStatusEvent(tx, request.id, request.status, PRESCRIPTION_STATUSES.convertedToOrder, 'admin', ctx.uid ?? null, `linkedOrderId:${order.id}`);
  });

  return buildPrescriptionRequestDto(ctx, request.id, storeId);
}
