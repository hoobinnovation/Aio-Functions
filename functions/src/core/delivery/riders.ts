import { v4 as uuidv4 } from 'uuid';
import { ActionContext, RiderAuthScope } from '../protocol';
import { AppError } from '../errors';
import { requireSessionIdentity } from '../identity';
import { DeliveryRider } from '../../entities/DeliveryRider';
import { Employee } from '../../entities/Employee';
import { UserProfile } from '../../entities/UserProfile';

type DeliveryTx = any;

const RIDER_EMPLOYEE_ROLES = new Set(['rider', 'delivery_rider', 'courier', 'driver']);

function trimOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function isRiderEmployeeRole(value: unknown): boolean {
  return RIDER_EMPLOYEE_ROLES.has(String(value ?? '').trim().toLowerCase());
}

function toRiderScope(record: DeliveryRider): RiderAuthScope {
  return {
    riderId: record.id,
    uid: record.uid,
    role: 'rider',
    storeId: record.storeId,
    branchId: record.branchId,
    displayName: record.displayName,
    phone: record.phone,
    vehicleType: record.vehicleType,
    status: record.status,
    presenceStatus: record.presenceStatus,
    activeOrderId: record.activeOrderId,
    activeTripId: record.activeTripId,
    lastSeenAt: record.lastSeenAt ? record.lastSeenAt.toISOString() : null,
  };
}

async function hydrateFromEmployee(tx: DeliveryTx, employee: Employee): Promise<DeliveryRider | null> {
  if (employee.status !== 'active' || !isRiderEmployeeRole(employee.role)) {
    return null;
  }

  const riderRepo = tx.getRepository(DeliveryRider);
  const existing = await riderRepo.findOneBy({ uid: employee.uid });
  if (existing) {
    return existing;
  }

  const profile = await tx.getRepository(UserProfile).findOneBy({ uid: employee.uid });
  const rider = riderRepo.create({
    id: employee.id || uuidv4(),
    uid: employee.uid,
    storeId: employee.storeId,
    branchId: null,
    displayName: trimOrNull(profile?.displayName),
    phone: trimOrNull(profile?.phone),
    vehicleType: null,
    status: 'active',
    presenceStatus: 'offline',
    activeOrderId: null,
    activeTripId: null,
    lastSeenAt: null,
  });
  await riderRepo.save(rider);
  return rider;
}

export async function resolveDeliveryRiderRecord(
  tx: DeliveryTx,
  uid: string
): Promise<DeliveryRider | null> {
  const riderRepo = tx.getRepository(DeliveryRider);
  const current = await riderRepo.findOneBy({ uid });
  if (current) {
    return current;
  }

  const employee = await tx.getRepository(Employee).findOneBy({ uid });
  if (!employee) {
    return null;
  }

  return hydrateFromEmployee(tx, employee);
}

export async function resolveDeliveryRiderScope(
  ctx: ActionContext,
  requestedStoreId?: string
): Promise<RiderAuthScope> {
  const uid = requireSessionIdentity(ctx);
  const rider = await resolveDeliveryRiderRecord(ctx.db.getRepository(DeliveryRider).manager, uid);

  if (!rider) {
    throw new AppError('RIDER_NOT_FOUND', 'No active delivery rider profile was found for this authenticated identity');
  }

  if (rider.status !== 'active') {
    throw new AppError('RIDER_INACTIVE', 'Delivery rider is not active');
  }

  if (requestedStoreId && requestedStoreId !== rider.storeId) {
    throw new AppError('DELIVERY_STORE_MISMATCH', 'Authenticated rider belongs to a different store scope', {
      requestedStoreId,
      riderStoreId: rider.storeId,
    });
  }

  return toRiderScope(rider);
}

export function requireDeliveryRider(ctx: ActionContext): RiderAuthScope {
  const rider = ctx.auth?.rider;
  if (!rider) {
    throw new AppError('RIDER_AUTH_REQUIRED', 'A valid delivery rider session is required');
  }
  return rider;
}
