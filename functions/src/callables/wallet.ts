import Joi from 'joi';
import { onCall } from 'firebase-functions/v2/https';
import { getDataSource } from '../db/data-source';
import { WalletAccountEntity } from '../db/entities/WalletAccountEntity';
import { WalletTransactionEntity } from '../db/entities/WalletTransactionEntity';
import { verifyFirebaseUser } from '../lib/auth';
import { mapError } from '../lib/errors';
import { uuidSchema, validatePayload } from '../lib/validators';

const getOrCreate = async (storeId: string, uid: string) => {
  const repo = (await getDataSource()).getRepository(WalletAccountEntity);
  let a = await repo.findOne({ where: { storeId, uid } });
  if (!a) a = await repo.save(repo.create({ storeId, uid, balance: '0.00' }));
  return a;
};

export const walletGet = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required() }), request.data);
    const account = await getOrCreate(payload.storeId, uid);
    const recentTxns = await (await getDataSource()).getRepository(WalletTransactionEntity).find({ where: { storeId: payload.storeId, uid }, order: { createdAt: 'DESC' }, take: 20 });
    return { balance: account.balance, recentTxns };
  } catch (error) { mapError(error); }
});

export const walletHistory = onCall(async (request) => {
  try {
    const uid = verifyFirebaseUser(request);
    const payload = validatePayload(Joi.object({ storeId: uuidSchema.required(), type: Joi.string().valid('cashback_earn','cashback_redeem','expire','adjust').optional(), page: Joi.number().integer().min(1).default(1), pageSize: Joi.number().integer().min(1).max(100).default(20) }), request.data);
    const repo = (await getDataSource()).getRepository(WalletTransactionEntity);
    const where = payload.type ? { storeId: payload.storeId, uid, type: payload.type } : { storeId: payload.storeId, uid };
    const [items, total] = await repo.findAndCount({ where, order: { createdAt: 'DESC' }, skip: (payload.page - 1) * payload.pageSize, take: payload.pageSize });
    return { items, total };
  } catch (error) { mapError(error); }
});
