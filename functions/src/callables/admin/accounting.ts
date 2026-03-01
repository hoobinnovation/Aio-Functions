import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../../db/data-source';
import { AccountingEntryEntity } from '../../db/entities/AccountingEntryEntity';
import { BranchEntity } from '../../db/entities/BranchEntity';
import { CashDrawerEntity } from '../../db/entities/CashDrawerEntity';
import { CashDrawerSessionEntity } from '../../db/entities/CashDrawerSessionEntity';
import { DeviceEntity } from '../../db/entities/DeviceEntity';
import { EmployeeEntity } from '../../db/entities/EmployeeEntity';
import { PosOrderEntity } from '../../db/entities/PosOrderEntity';
import { writeAudit } from '../../lib/audit';
import { verifyAdminRole, verifyFirebaseUser, verifyStoreAccess } from '../../lib/auth';
import { failedPrecondition, mapError, notFound } from '../../lib/errors';
import { uuidSchema, validatePayload } from '../../lib/validators';

const ensureAdmin = async (uid: string, storeId: string): Promise<void> => {
  await verifyAdminRole(uid, ['SUPER_ADMIN', 'STORE_ADMIN', 'SUPPORT']);
  await verifyStoreAccess(uid, storeId);
};

const filtersWhere = (payload: Record<string, unknown>) => {
  const where: Record<string, unknown> = {};
  if (payload.branchId) where.branchId = payload.branchId;
  if (payload.deviceId) where.deviceId = payload.deviceId;
  if (payload.employeeId) where.employeeId = payload.employeeId;
  if (payload.sourceChannel) where.sourceChannel = payload.sourceChannel;
  if (payload.paymentMethod) where.paymentMethod = payload.paymentMethod;
  if (payload.type) where.type = payload.type;
  return where;
};

export const adminAccountingKpis = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), from: Joi.date().required(), to: Joi.date().required() }).unknown(true), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const qb = (await getDataSource())
      .getRepository(AccountingEntryEntity)
      .createQueryBuilder('e')
      .where('e.storeId = :storeId', { storeId: payload.storeId })
      .andWhere('e.createdAt BETWEEN :from AND :to', { from: payload.from, to: payload.to });

    if ((payload as any).branchId) qb.andWhere('e.branchId = :branchId', { branchId: (payload as any).branchId });
    if ((payload as any).employeeId) qb.andWhere('e.employeeId = :employeeId', { employeeId: (payload as any).employeeId });
    if ((payload as any).deviceId) qb.andWhere('e.deviceId = :deviceId', { deviceId: (payload as any).deviceId });
    if ((payload as any).sourceChannel) qb.andWhere('e.sourceChannel = :sourceChannel', { sourceChannel: (payload as any).sourceChannel });

    const kpis = await qb
      .select("COALESCE(SUM(CASE WHEN e.type='revenue' THEN e.amount ELSE 0 END),0)", 'revenue')
      .addSelect("COALESCE(SUM(CASE WHEN e.type='expense' THEN e.amount ELSE 0 END),0)", 'expense')
      .addSelect('COALESCE(SUM(CASE WHEN e.type=\'revenue\' THEN e.amount ELSE -e.amount END),0)', 'net')
      .addSelect('COUNT(1)', 'entries')
      .getRawOne();

    return { kpis };
  } catch (error) {
    mapError(error);
  }
});

export const adminAccountingLedger = onCall(async (request) => {
  try {
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        from: Joi.date().required(),
        to: Joi.date().required(),
        page: Joi.number().integer().min(1).default(1),
        pageSize: Joi.number().integer().min(1).max(100).default(20),
      }).unknown(true),
      request.data,
    );
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const qb = (await getDataSource())
      .getRepository(AccountingEntryEntity)
      .createQueryBuilder('e')
      .where('e.storeId = :storeId', { storeId: payload.storeId })
      .andWhere('e.createdAt BETWEEN :from AND :to', { from: payload.from, to: payload.to });

    if ((payload as any).branchId) qb.andWhere('e.branchId = :branchId', { branchId: (payload as any).branchId });
    if ((payload as any).deviceId) qb.andWhere('e.deviceId = :deviceId', { deviceId: (payload as any).deviceId });
    if ((payload as any).employeeId) qb.andWhere('e.employeeId = :employeeId', { employeeId: (payload as any).employeeId });
    if ((payload as any).sourceChannel) qb.andWhere('e.sourceChannel = :sourceChannel', { sourceChannel: (payload as any).sourceChannel });
    if ((payload as any).paymentMethod) qb.andWhere('e.paymentMethod = :paymentMethod', { paymentMethod: (payload as any).paymentMethod });
    if ((payload as any).type) qb.andWhere('e.type = :type', { type: (payload as any).type });

    const [items, total] = await qb.orderBy('e.createdAt', 'DESC').skip((payload.page - 1) * payload.pageSize).take(payload.pageSize).getManyAndCount();
    return { items, total };
  } catch (error) {
    mapError(error);
  }
});

export const adminAccountingCreateExpense = onCall(async (request) => {
  try {
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        amount: Joi.number().positive().required(),
        method: Joi.string().valid('cash', 'card', 'online', 'wallet').required(),
        branchId: uuidSchema.allow(null),
        deviceId: uuidSchema.allow(null),
        employeeId: uuidSchema.allow(null),
        drawerSessionId: uuidSchema.allow(null),
        category: Joi.string().required(),
        note: Joi.string().allow('', null),
      }),
      request.data,
    );
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    if (payload.method === 'cash' && !payload.drawerSessionId) failedPrecondition('Cash expense requires drawerSessionId.');

    const repo = (await getDataSource()).getRepository(AccountingEntryEntity);
    const row = await repo.save(
      repo.create({
        storeId: payload.storeId,
        type: 'expense',
        amount: payload.amount.toFixed(2),
        currency: 'EGP',
        sourceChannel: 'branch',
        paymentMethod: payload.method,
        branchId: payload.branchId ?? null,
        deviceId: payload.deviceId ?? null,
        employeeId: payload.employeeId ?? null,
        drawerSessionId: payload.drawerSessionId ?? null,
        category: payload.category,
        note: payload.note || null,
        refType: 'manual_expense',
      }),
    );
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin_accounting.create_expense', targetType: 'accounting_entry', targetId: row.id, storeId: payload.storeId });
    return { entry: row };
  } catch (error) {
    mapError(error);
  }
});

export const adminAccountingOpenDrawerSession = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), drawerId: uuidSchema.required(), openingCash: Joi.number().min(0).required(), employeeId: uuidSchema.required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const ds = await getDataSource();
    const drawer = await ds.getRepository(CashDrawerEntity).findOne({ where: { id: payload.drawerId, storeId: payload.storeId, isActive: true } });
    if (!drawer) notFound('Cash drawer not found.');

    const repo = ds.getRepository(CashDrawerSessionEntity);
    const existing = await repo.findOne({ where: { drawerId: payload.drawerId, status: 'open' } });
    if (existing) failedPrecondition('Drawer already has open session.');

    const row = await repo.save(repo.create({ drawerId: payload.drawerId, openedByEmployeeId: payload.employeeId, openedAt: new Date(), openingCash: payload.openingCash.toFixed(2), status: 'open' }));
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin_accounting.open_drawer_session', targetType: 'cash_drawer_session', targetId: row.id, storeId: payload.storeId });
    return { session: row };
  } catch (error) {
    mapError(error);
  }
});

export const adminAccountingCloseDrawerSession = onCall(async (request) => {
  try {
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), sessionId: uuidSchema.required(), closingCashCounted: Joi.number().min(0).required() }), request.data);
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const ds = await getDataSource();
    const repo = ds.getRepository(CashDrawerSessionEntity);
    const row = await repo.findOne({ where: { id: payload.sessionId } });
    if (!row) notFound('Drawer session not found.');
    if (row.status !== 'open') failedPrecondition('Drawer session already closed.');

    row.closedAt = new Date();
    row.closingCashCounted = payload.closingCashCounted.toFixed(2);
    row.variance = (payload.closingCashCounted - Number(row.openingCash)).toFixed(2);
    row.status = 'closed';
    await repo.save(row);
    await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin_accounting.close_drawer_session', targetType: 'cash_drawer_session', targetId: row.id, storeId: payload.storeId });
    return { session: row };
  } catch (error) {
    mapError(error);
  }
});

export const adminAccountingCreatePOSSale = onCall(async (request) => {
  try {
    const payload = validatePayload(
      Joi.object({
        storeId: uuidSchema.required(),
        branchId: uuidSchema.required(),
        deviceId: uuidSchema.required(),
        employeeId: uuidSchema.required(),
        items: Joi.array().items(Joi.object({ productId: uuidSchema.required(), qty: Joi.number().integer().min(1).required(), unitPrice: Joi.number().positive().required() })).min(1).required(),
        paymentMethod: Joi.string().valid('cash', 'card', 'online', 'wallet').required(),
        cashSessionId: uuidSchema.allow(null),
      }),
      request.data,
    );
    const uid = verifyFirebaseUser(request);
    await ensureAdmin(uid, payload.storeId);

    const ds = await getDataSource();
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const branch = await qr.manager.getRepository(BranchEntity).findOne({ where: { id: payload.branchId, storeId: payload.storeId, isActive: true } });
      if (!branch) notFound('Branch not found.');
      const device = await qr.manager.getRepository(DeviceEntity).findOne({ where: { id: payload.deviceId, storeId: payload.storeId } });
      if (!device) notFound('Device not found.');
      const employee = await qr.manager.getRepository(EmployeeEntity).findOne({ where: { id: payload.employeeId, storeId: payload.storeId, isActive: true } });
      if (!employee) notFound('Employee not found.');

      if (payload.paymentMethod === 'cash') {
        if (!payload.cashSessionId) failedPrecondition('cashSessionId is required for cash payment.');
        const cashSession = await qr.manager.getRepository(CashDrawerSessionEntity).findOne({ where: { id: payload.cashSessionId, status: 'open' } });
        if (!cashSession) failedPrecondition('Cash drawer session is not open.');
      }

      const snapshot = payload.items.map((i) => ({ productId: i.productId, qty: i.qty, unitPrice: i.unitPrice, lineTotal: i.unitPrice * i.qty }));
      const subtotal = snapshot.reduce((sum, i) => sum + i.lineTotal, 0);

      const pos = await qr.manager.getRepository(PosOrderEntity).save(
        qr.manager.getRepository(PosOrderEntity).create({
          storeId: payload.storeId,
          branchId: payload.branchId,
          deviceId: payload.deviceId,
          employeeId: payload.employeeId,
          itemsSnapshot: snapshot,
          paymentMethod: payload.paymentMethod,
          cashSessionId: payload.cashSessionId ?? null,
          subtotal: subtotal.toFixed(2),
          total: subtotal.toFixed(2),
        }),
      );

      const entry = await qr.manager.getRepository(AccountingEntryEntity).save(
        qr.manager.getRepository(AccountingEntryEntity).create({
          storeId: payload.storeId,
          type: 'revenue',
          amount: subtotal.toFixed(2),
          currency: 'EGP',
          sourceChannel: 'pos',
          paymentMethod: payload.paymentMethod,
          branchId: payload.branchId,
          deviceId: payload.deviceId,
          employeeId: payload.employeeId,
          drawerSessionId: payload.paymentMethod === 'cash' ? payload.cashSessionId ?? null : null,
          refType: 'pos_order',
          refId: pos.id,
          note: 'POS sale',
        }),
      );

      await writeAudit({ actorType: 'admin', actorUid: uid, action: 'admin_accounting.create_pos_sale', targetType: 'pos_order', targetId: pos.id, storeId: payload.storeId }, qr.manager);

      await qr.commitTransaction();
      return { posOrder: pos, ledgerEntry: entry };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  } catch (error) {
    mapError(error);
  }
});
