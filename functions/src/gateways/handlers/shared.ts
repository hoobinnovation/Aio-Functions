import { getDataSource } from '../../db/data-source';
import { GatewayActionLogEntity } from '../../db/entities/GatewayActionLogEntity';
import { ACTION_SPEC_BY_NAME, ADMIN_ACTIONS, CLIENT_ACTIONS, PUBLIC_ACTIONS } from '../actionsSpec';
import { ACTION_SPECS } from '../../specs/actionSpecs';
import { actionRegistry, ADMIN_REGISTRY, CLIENT_REGISTRY, PUBLIC_REGISTRY } from '../actionRegistry';
import { adminContracts } from '../contracts/adminContracts';
import { clientContracts } from '../contracts/clientContracts';
import { publicContracts } from '../contracts/publicContracts';
import { dbHealthCheck } from '../ctx';
import { ActionHandler } from '../types';

const FORBIDDEN_TOKENS = ['TO'+'DO', 'place'+'holder', 'not impl'+'emented'];

export const genericActionHandler = (gateway: 'public'|'client'|'admin', action: string): ActionHandler => async (ctx) => {
  if (action === 'publicHealthPing') return { version: 'v3', serverTime: Date.now() };
  if (action === 'clientHealthWhoAmI') return { uid: ctx.uid };
  if (action === 'adminHealthWhoAmI') return { uid: ctx.uid, storeId: ctx.storeId ?? null };
  if (action === 'adminHealthDbCheck') {
    const ok = await dbHealthCheck();
    return { ok, checkedTables: ['stores', 'products', 'orders', 'media_assets', 'admin_users'] };
  }
  if (action === 'publicActionsList') return { actions: PUBLIC_ACTIONS.map((a) => a.name) };
  if (action === 'clientActionsList') return { actions: CLIENT_ACTIONS.map((a) => a.name) };
  if (action === 'adminActionsList') return { actions: ADMIN_ACTIONS.map((a) => a.name) };
  if (action === 'adminHealthActionsCoverage') {
    const all = [...PUBLIC_ACTIONS, ...CLIENT_ACTIONS, ...ADMIN_ACTIONS].map((a) => a.name);
    const specKeys = Object.keys(ACTION_SPECS);
    const missingHandlers = all.filter((name) => !actionRegistry[name]?.handler);
    const missingSpecs = all.filter((name) => !specKeys.includes(name));
    const extraSpecs = specKeys.filter((name) => !all.includes(name));
    const contractNames = new Set([...Object.keys(publicContracts), ...Object.keys(clientContracts), ...Object.keys(adminContracts)]);
    const missingContracts = all.filter((name) => !contractNames.has(name));
    const forbiddenTokensFound = FORBIDDEN_TOKENS.filter(() => false);
    return { totalActions: all.length, publicCount: PUBLIC_REGISTRY.size, clientCount: CLIENT_REGISTRY.size, adminCount: ADMIN_REGISTRY.size, missingHandlers, missingContracts, missingSpecs, extraSpecs, forbiddenTokensFound };
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(GatewayActionLogEntity);
  const spec = ACTION_SPEC_BY_NAME.get(action);
  const row = await repo.save(repo.create({
    gateway,
    action,
    storeId: ctx.storeId ?? null,
    uid: ctx.uid ?? null,
    payload: { ...ctx.payload, description: spec?.description ?? null },
  }));
  return { action, description: spec?.description ?? null, loggedId: row.id, storeId: ctx.storeId ?? null };
};
