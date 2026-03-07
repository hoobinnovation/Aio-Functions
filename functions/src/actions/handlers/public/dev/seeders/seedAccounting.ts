import { Branch } from '../../../../../entities/Branch';
import { Device } from '../../../../../entities/Device';
import { Employee } from '../../../../../entities/Employee';
import { Drawer } from '../../../../../entities/Drawer';
import { DrawerSession } from '../../../../../entities/DrawerSession';
import { LedgerEntry } from '../../../../../entities/LedgerEntry';
import { RiskRule } from '../../../../../entities/RiskRule';
import { RiskFlag } from '../../../../../entities/RiskFlag';
import { deterministicId, strNum, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';

export async function seedAccounting(ctx: SeedContext, summary: SeedSummary) {
  const { manager, storeId, demoUids } = ctx;
  const branchId = deterministicId('branch', 1);
  const deviceId = deterministicId('device', 1);
  const employeeId = deterministicId('employee', 1);
  const drawerId = deterministicId('drawer', 1);
  const drawerSessionId = deterministicId('drsession', 1);

  await upsertById(manager, Branch, 'Branch', {
    id: branchId,
    storeId,
    name: 'Main Branch',
    status: 'active',
  }, summary);

  await upsertById(manager, Device, 'Device', {
    id: deviceId,
    storeId,
    branchId,
    name: 'POS-1',
    status: 'active',
  }, summary);

  await upsertById(manager, Employee, 'Employee', {
    id: employeeId,
    storeId,
    uid: demoUids.adminOwnerUid,
    role: 'cashier',
    status: 'active',
  }, summary);

  await upsertById(manager, Drawer, 'Drawer', {
    id: drawerId,
    storeId,
    branchId,
    name: 'Main Drawer',
    status: 'active',
  }, summary);

  await upsertById(manager, DrawerSession, 'DrawerSession', {
    id: drawerSessionId,
    drawerId,
    openedByUid: demoUids.adminOwnerUid,
    openedAt: new Date(),
    closedByUid: null,
    closedAt: null,
    openingBalanceCents: strNum(50000),
    closingBalanceCents: null,
  }, summary);

  await upsertById(manager, LedgerEntry, 'LedgerEntry', {
    id: deterministicId('ledger', 1),
    storeId,
    amountCents: strNum(1800),
    type: 'sale',
    channel: 'pos',
    branchId,
    deviceId,
    employeeId,
    drawerSessionId,
    refType: 'order',
    refId: deterministicId('order', 1),
  }, summary);

  await upsertById(manager, RiskRule, 'RiskRule', {
    storeId,
    config: { maxDailyOrders: 20, strictPaymentCheck: false },
  }, summary);

  await upsertById(manager, RiskFlag, 'RiskFlag', {
    id: deterministicId('riskflag', 1),
    orderId: deterministicId('order', 1),
    status: 'open',
    reason: 'Seeded risk review sample',
    resolvedByUid: null,
    resolvedAt: null,
  }, summary);
}
