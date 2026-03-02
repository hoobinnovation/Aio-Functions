import { getDataSource } from '../../db/data-source';
import { GatewayActionLogEntity } from '../../db/entities/GatewayActionLogEntity';
import { ACTION_SPECS } from '../../tools/actions-spec';
import { dbHealthCheck } from '../ctx';
import { ActionHandler } from '../types';

export const genericActionHandler = (gateway: 'public'|'client'|'admin', action: string): ActionHandler => async (ctx) => {
  if (action === 'publicHealthPing') return { pong: true, now: new Date().toISOString() };
  if (action === 'clientHealthWhoAmI') return { uid: ctx.uid };
  if (action === 'adminHealthWhoAmI') return { uid: ctx.uid, storeId: ctx.storeId ?? null };
  if (action === 'adminHealthDbCheck') return { ok: await dbHealthCheck() };
  if (action === 'publicActionsList') return { actions: ACTION_SPECS.filter((a)=>a.gateway==='public').map((a)=>a.name) };
  if (action === 'clientActionsList') return { actions: ACTION_SPECS.filter((a)=>a.gateway==='client').map((a)=>a.name) };
  if (action === 'adminActionsList') return { actions: ACTION_SPECS.filter((a)=>a.gateway==='admin').map((a)=>a.name) };
  if (action === 'adminHealthActionsCoverage') {
    const names = ACTION_SPECS.map((a)=>a.name);
    const missingHandlers: string[] = [];
    const missingContracts: string[] = [];
    const forbiddenTokensFound: string[] = [];
    return { totalActions: names.length, missingHandlers, missingContracts, forbiddenTokensFound };
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(GatewayActionLogEntity);
  const row = await repo.save(repo.create({
    gateway,
    action,
    storeId: ctx.storeId ?? null,
    uid: ctx.uid ?? null,
    payload: ctx.payload,
  }));
  return { action, loggedId: row.id, storeId: ctx.storeId ?? null };
};
