import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActionContext } from './protocol';
import { AppError } from './errors';
import { PrescriptionRequest } from '../entities/PrescriptionRequest';
import { PrescriptionRequestFile } from '../entities/PrescriptionRequestFile';
import { PrescriptionRequestStatusEvent } from '../entities/PrescriptionRequestStatusEvent';
import { PrescriptionRequestItemDraft } from '../entities/PrescriptionRequestItemDraft';
import { MediaAsset } from '../entities/MediaAsset';
import { UserProfile } from '../entities/UserProfile';
import { Product } from '../entities/Product';
import { ProductVariant } from '../entities/ProductVariant';
import { StoreSettings } from '../entities/StoreSettings';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { OrderStatusEvent } from '../entities/OrderStatusEvent';
import { Shipment } from '../entities/Shipment';
import { StockMovement } from '../entities/StockMovement';

export const PRESCRIPTION_STATUSES = Object.freeze({
  draft: 'draft',
  submitted: 'submitted',
  underReview: 'under_review',
  approved: 'approved',
  rejectedUnreadable: 'rejected_unreadable',
  convertedToOrder: 'converted_to_order',
  cancelled: 'cancelled',
});

export type PrescriptionStatus = typeof PRESCRIPTION_STATUSES[keyof typeof PRESCRIPTION_STATUSES];

const CUSTOMER_MUTABLE_STATUSES = new Set<PrescriptionStatus>([
  PRESCRIPTION_STATUSES.draft,
  PRESCRIPTION_STATUSES.submitted,
]);

export async function getPrescriptionWhatsAppContact(db: ActionContext['db'], storeId: string): Promise<string | null> {
  const settings = await db.getRepository(StoreSettings).findOneBy({ storeId });
  return settings?.supportWhatsApp ?? null;
}

export async function appendPrescriptionStatusEvent(
  tx: EntityManager,
  requestId: string,
  fromStatus: string | null,
  toStatus: string,
  actorType: string,
  actorId: string | null,
  note?: string | null
): Promise<void> {
  await tx.getRepository(PrescriptionRequestStatusEvent).save(
    tx.getRepository(PrescriptionRequestStatusEvent).create({
      id: uuidv4(),
      prescriptionRequestId: requestId,
      fromStatus,
      toStatus,
      actorType,
      actorId,
      note: note ?? null,
    })
  );
}

export async function requirePrescriptionRequestForUser(ctx: ActionContext, requestId: string, userId: string, storeId = ctx.storeId!): Promise<PrescriptionRequest> {
  const request = await ctx.db.getRepository(PrescriptionRequest).findOneBy({ id: requestId, storeId, userId });
  if (!request) throw new AppError('NOT_FOUND', 'Prescription request not found');
  return request;
}

export async function requirePrescriptionRequestForStore(ctx: ActionContext, requestId: string, storeId = ctx.storeId!): Promise<PrescriptionRequest> {
  const request = await ctx.db.getRepository(PrescriptionRequest).findOneBy({ id: requestId, storeId });
  if (!request) throw new AppError('NOT_FOUND', 'Prescription request not found');
  return request;
}

export function assertPrescriptionStatusTransition(current: string, next: PrescriptionStatus): void {
  if (current === next) return;
  const allowed: Record<string, PrescriptionStatus[]> = {
    [PRESCRIPTION_STATUSES.draft]: [PRESCRIPTION_STATUSES.submitted, PRESCRIPTION_STATUSES.cancelled],
    [PRESCRIPTION_STATUSES.submitted]: [PRESCRIPTION_STATUSES.underReview, PRESCRIPTION_STATUSES.approved, PRESCRIPTION_STATUSES.rejectedUnreadable, PRESCRIPTION_STATUSES.cancelled],
    [PRESCRIPTION_STATUSES.underReview]: [PRESCRIPTION_STATUSES.approved, PRESCRIPTION_STATUSES.rejectedUnreadable],
    [PRESCRIPTION_STATUSES.approved]: [PRESCRIPTION_STATUSES.convertedToOrder],
    [PRESCRIPTION_STATUSES.rejectedUnreadable]: [],
    [PRESCRIPTION_STATUSES.convertedToOrder]: [],
    [PRESCRIPTION_STATUSES.cancelled]: [],
  };
  if (!(allowed[current] || []).includes(next)) {
    throw new AppError('VALIDATION_ERROR', `Prescription request cannot move from ${current} to ${next}`);
  }
}

export function assertPrescriptionCustomerMutable(request: PrescriptionRequest): void {
  if (!CUSTOMER_MUTABLE_STATUSES.has(request.status as PrescriptionStatus)) {
    throw new AppError('VALIDATION_ERROR', 'Prescription request can no longer be changed');
  }
}

export async function buildPrescriptionRequestDto(ctx: ActionContext, requestId: string, storeId = ctx.storeId!) {
  const request = await requirePrescriptionRequestForStore(ctx, requestId, storeId);
  const [profile, files, statusEvents, itemDrafts, linkedOrder, whatsappContact] = await Promise.all([
    ctx.db.getRepository(UserProfile).findOneBy({ uid: request.userId }),
    ctx.db.getRepository(PrescriptionRequestFile).find({ where: { prescriptionRequestId: request.id }, order: { sortOrder: 'ASC' as any, createdAt: 'ASC' as any } }),
    ctx.db.getRepository(PrescriptionRequestStatusEvent).find({ where: { prescriptionRequestId: request.id }, order: { createdAt: 'DESC' as any } }),
    ctx.db.getRepository(PrescriptionRequestItemDraft).find({ where: { prescriptionRequestId: request.id }, order: { createdAt: 'ASC' as any } }),
    request.linkedOrderId ? ctx.db.getRepository(Order).findOneBy({ id: request.linkedOrderId }) : Promise.resolve(null),
    getPrescriptionWhatsAppContact(ctx.db, storeId),
  ]);

  const mediaIds = files.map((file: PrescriptionRequestFile) => file.mediaAssetId).filter(Boolean);
  const productIds = itemDrafts.map((item: PrescriptionRequestItemDraft) => item.productId).filter(Boolean);
  const variantIds = itemDrafts.map((item: PrescriptionRequestItemDraft) => item.variantId).filter(Boolean);

  const [mediaAssets, products, variants] = await Promise.all([
    mediaIds.length ? ctx.db.getRepository(MediaAsset).findByIds(mediaIds) : Promise.resolve([] as MediaAsset[]),
    productIds.length ? ctx.db.getRepository(Product).findByIds(productIds) : Promise.resolve([] as Product[]),
    variantIds.length ? ctx.db.getRepository(ProductVariant).findByIds(variantIds) : Promise.resolve([] as ProductVariant[]),
  ]);

  const mediaMap = new Map<string, MediaAsset>(mediaAssets.map((asset: MediaAsset) => [asset.id, asset]));
  const productMap = new Map<string, Product>(products.map((product: Product) => [product.id, product]));
  const variantMap = new Map<string, ProductVariant>(variants.map((variant: ProductVariant) => [variant.id, variant]));

  return {
    request: {
      ...request,
      customerName: request.customerName || profile?.displayName || null,
      customerPhone: request.customerPhone || profile?.phone || null,
      customerEmail: profile?.email || null,
    },
    files: files.map((file: PrescriptionRequestFile) => {
      const mediaAsset = mediaMap.get(file.mediaAssetId) || null;
      return {
        ...file,
        path: mediaAsset?.originalPath || null,
        originalPath: mediaAsset?.originalPath || null,
        thumbnailPath: mediaAsset?.thumbnailPath || null,
        contentType: mediaAsset?.contentType || null,
        sizeBytes: mediaAsset?.sizeBytes ? Number(mediaAsset.sizeBytes) : 0,
        mediaStatus: mediaAsset?.status || null,
      };
    }),
    itemDrafts: itemDrafts.map((item: PrescriptionRequestItemDraft) => {
      const product = productMap.get(item.productId) || null;
      const variant = variantMap.get(item.variantId) || null;
      return {
        ...item,
        productName: product?.name || null,
        productSlug: product?.slug || null,
        variantSku: variant?.sku || null,
        unitPriceCents: variant?.priceCents || null,
        stockQty: variant?.stockQty ?? null,
      };
    }),
    statusEvents,
    linkedOrder: linkedOrder || null,
    whatsappContact,
  };
}

export async function replacePrescriptionDraftItems(
  ctx: ActionContext,
  tx: EntityManager,
  request: PrescriptionRequest,
  items: Array<{ productId: string; variantId: string; qty: number; note?: string | null }>
): Promise<void> {
  const normalizedItems = Array.isArray(items) ? items : [];
  if (!normalizedItems.length) {
    await tx.getRepository(PrescriptionRequestItemDraft).delete({ prescriptionRequestId: request.id });
    return;
  }

  const productIds = normalizedItems.map((item) => item.productId);
  const variantIds = normalizedItems.map((item) => item.variantId);
  const products = await tx.getRepository(Product).findByIds(productIds);
  const variants = await tx.getRepository(ProductVariant).findByIds(variantIds);
  const productMap = new Map<string, Product>(products.map((product: Product) => [product.id, product]));
  const variantMap = new Map<string, ProductVariant>(variants.map((variant: ProductVariant) => [variant.id, variant]));

  for (const item of normalizedItems) {
    const product = productMap.get(item.productId);
    const variant = variantMap.get(item.variantId);
    if (!product) throw new AppError('NOT_FOUND', 'Mapped product not found');
    if (!variant || variant.productId !== item.productId) throw new AppError('NOT_FOUND', 'Mapped variant not found');
    if (product.storeId && product.storeId !== request.storeId) {
      throw new AppError('FORBIDDEN', 'Mapped product does not belong to this store');
    }
    if (variant.status !== 'active') {
      throw new AppError('VALIDATION_ERROR', 'Mapped variant is inactive');
    }
    if (Number(item.qty || 0) <= 0) {
      throw new AppError('VALIDATION_ERROR', 'Mapped quantity must be greater than zero');
    }
  }

  await tx.getRepository(PrescriptionRequestItemDraft).delete({ prescriptionRequestId: request.id });
  for (let index = 0; index < normalizedItems.length; index += 1) {
    const item = normalizedItems[index];
    await tx.getRepository(PrescriptionRequestItemDraft).save(
      tx.getRepository(PrescriptionRequestItemDraft).create({
        id: uuidv4(),
        prescriptionRequestId: request.id,
        productId: item.productId,
        variantId: item.variantId,
        qty: Math.max(1, Number(item.qty || 1)),
        note: item.note ?? null,
      })
    );
  }
}

export async function convertPrescriptionRequestToOrder(ctx: ActionContext, requestId: string, adminUid: string, storeId = ctx.storeId!) {
  const request = await requirePrescriptionRequestForStore(ctx, requestId, storeId);
  if (request.linkedOrderId) throw new AppError('CONFLICT', 'Prescription request is already linked to an order');
  if (request.status !== PRESCRIPTION_STATUSES.approved) {
    throw new AppError('VALIDATION_ERROR', 'Prescription request must be approved before conversion');
  }

  const itemDrafts = await ctx.db.getRepository(PrescriptionRequestItemDraft).find({ where: { prescriptionRequestId: request.id } });
  if (!itemDrafts.length) {
    throw new AppError('VALIDATION_ERROR', 'Prescription request has no mapped items');
  }

  const variantIds = itemDrafts.map((item: PrescriptionRequestItemDraft) => item.variantId);
  const productIds = itemDrafts.map((item: PrescriptionRequestItemDraft) => item.productId);
  const [variants, products] = await Promise.all([
    ctx.db.getRepository(ProductVariant).findByIds(variantIds),
    ctx.db.getRepository(Product).findByIds(productIds),
  ]);
  const variantMap = new Map<string, ProductVariant>(variants.map((variant: ProductVariant) => [variant.id, variant]));
  const productMap = new Map<string, Product>(products.map((product: Product) => [product.id, product]));
  const orderId = uuidv4();

  await ctx.db.transaction(async (tx: EntityManager) => {
    let subtotalCents = 0;

    for (const item of itemDrafts) {
      const variant = variantMap.get(item.variantId);
      const product = productMap.get(item.productId);
      if (!variant || !product) throw new AppError('NOT_FOUND', 'Prescription mapped item is invalid');
      if (variant.status !== 'active') throw new AppError('VALIDATION_ERROR', 'Mapped variant is inactive');
      if (Number(variant.stockQty) < Number(item.qty)) throw new AppError('OUT_OF_STOCK', 'Mapped variant stock is insufficient');
      subtotalCents += Number(variant.priceCents) * Number(item.qty);
    }

    await tx.getRepository(Order).save(
      tx.getRepository(Order).create({
        id: orderId,
        storeId: request.storeId,
        uid: request.userId,
        channel: 'prescription',
        status: 'pending',
        serviceType: 'standard',
        branchId: null,
        tableId: null,
        dineInSessionId: null,
        deliveryZoneId: null,
        deliveryZoneName: null,
        shippingMethodId: null,
        shippingRecipientName: request.customerName ?? null,
        shippingPhone: request.customerPhone ?? null,
        shippingAddressLabel: 'Prescription Request',
        shippingAddressLine: request.notes ?? null,
        subtotalCents: String(subtotalCents),
        discountCents: '0',
        shippingCents: '0',
        taxCents: '0',
        totalCents: String(subtotalCents),
        paymentStatus: 'pending',
        riskStatus: 'clear',
      })
    );

    for (const item of itemDrafts) {
      const variant = variantMap.get(item.variantId)!;
      const product = productMap.get(item.productId)!;
      const beforeQty = Number(variant.stockQty);
      const afterQty = beforeQty - Number(item.qty);

      await tx.getRepository(OrderItem).save(
        tx.getRepository(OrderItem).create({
          id: uuidv4(),
          orderId,
          productId: product.id,
          variantId: variant.id,
          nameSnapshot: product.name,
          priceCents: variant.priceCents,
          qty: Number(item.qty),
        })
      );

      await tx.getRepository(ProductVariant).update({ id: variant.id }, { stockQty: Math.round(afterQty) });
      await tx.getRepository(StockMovement).save(
        tx.getRepository(StockMovement).create({
          id: uuidv4(),
          storeId: request.storeId,
          variantId: variant.id,
          warehouseId: null,
          warehouseLocationId: null,
          lotId: null,
          movementType: 'sale_issue',
          qtyDelta: (-Number(item.qty)).toFixed(3),
          beforeQty: beforeQty.toFixed(3),
          afterQty: afterQty.toFixed(3),
          unitCostCents: null,
          sourceDocumentType: 'order',
          sourceDocumentId: orderId,
          sourceEventType: 'prescription_convert',
          metadata: { prescriptionRequestId: request.id, productId: product.id },
          createdByUid: adminUid,
        })
      );
    }

    await tx.getRepository(OrderStatusEvent).save(
      tx.getRepository(OrderStatusEvent).create({
        id: uuidv4(),
        orderId,
        status: 'pending',
        note: `Created from prescription request ${request.id}`,
        createdByUid: adminUid,
      })
    );

    await tx.getRepository(Shipment).save(
      tx.getRepository(Shipment).create({
        id: uuidv4(),
        orderId,
        carrier: null,
        trackingNumber: null,
        status: 'pending',
      })
    );

    await tx.getRepository(PrescriptionRequest).update(
      { id: request.id },
      {
        linkedOrderId: orderId,
        status: PRESCRIPTION_STATUSES.convertedToOrder,
        statusMessage: 'تم تحويل الروشتة إلى طلب فعلي',
        reviewedByAdminId: adminUid,
        reviewedAt: new Date(),
      }
    );

    await appendPrescriptionStatusEvent(
      tx,
      request.id,
      request.status,
      PRESCRIPTION_STATUSES.convertedToOrder,
      'admin',
      adminUid,
      `linkedOrderId:${orderId}`
    );
  });

  return buildPrescriptionRequestDto(ctx, request.id, storeId);
}
