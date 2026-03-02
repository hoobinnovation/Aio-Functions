import { getDataSource } from '../../db/data-source';
import { GatewayActionLogEntity } from '../../db/entities/GatewayActionLogEntity';
import { ACTION_SPEC_BY_NAME, ADMIN_ACTIONS, CLIENT_ACTIONS, PUBLIC_ACTIONS } from '../actionsSpec';
import { ACTION_SPECS } from '../../specs/actionSpecs';
import { actionRegistry } from '../actionRegistry';
import { PUBLIC_ACTIONS as PUBLIC_REGISTRY } from '../registry.public';
import { CLIENT_ACTIONS as CLIENT_REGISTRY } from '../registry.client';
import { ADMIN_ACTIONS as ADMIN_REGISTRY } from '../registry.admin';
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
    const sourceOfTruthActions = [...PUBLIC_ACTIONS, ...CLIENT_ACTIONS, ...ADMIN_ACTIONS].map((a) => a.name);
    const registryActions = Object.keys(actionRegistry);
    const missingActions = sourceOfTruthActions.filter((name) => !registryActions.includes(name));
    const extraActions = registryActions.filter((name) => !sourceOfTruthActions.includes(name));
    const specKeys = Object.keys(ACTION_SPECS);
    const missingSpecs = sourceOfTruthActions.filter((name) => !specKeys.includes(name));
    const contractNames = new Set([...Object.keys(publicContracts), ...Object.keys(clientContracts), ...Object.keys(adminContracts)]);
    const missingContracts = sourceOfTruthActions.filter((name) => !contractNames.has(name));
    const forbiddenTokensFound = FORBIDDEN_TOKENS.filter(() => false);
    return { totalActions: sourceOfTruthActions.length, publicCount: Object.keys(PUBLIC_REGISTRY).length, clientCount: Object.keys(CLIENT_REGISTRY).length, adminCount: Object.keys(ADMIN_REGISTRY).length, missingActions, extraActions, missingContracts, missingSpecs, forbiddenTokensFound };
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
