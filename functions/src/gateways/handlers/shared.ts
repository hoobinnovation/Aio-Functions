import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDataSource } from '../../db/data-source';
import { GatewayActionLogEntity } from '../../db/entities/GatewayActionLogEntity';
import { ACTION_SPECS } from '../../tools/actions-spec';
import { dbHealthCheck } from '../ctx';
import { ActionHandler } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
};

export const genericActionHandler = (gateway: 'public'|'client'|'admin', action: string): ActionHandler => async (ctx) => {
  if (action === 'publicHealthPing') return { version: 'v2', serverTime: Date.now() };
  if (action === 'clientHealthWhoAmI') return { uid: ctx.uid };
  if (action === 'adminHealthWhoAmI') return { uid: ctx.uid, storeId: ctx.storeId ?? null };
  if (action === 'adminHealthDbCheck') return { ok: await dbHealthCheck() };
  if (action === 'publicActionsList') return { actions: ACTION_SPECS.filter((a)=>a.gateway==='public').map((a)=>a.name) };
  if (action === 'clientActionsList') return { actions: ACTION_SPECS.filter((a)=>a.gateway==='client').map((a)=>a.name) };
  if (action === 'adminActionsList') return { actions: ACTION_SPECS.filter((a)=>a.gateway==='admin').map((a)=>a.name) };
  if (action === 'adminHealthActionsCoverage') {
    const names = ACTION_SPECS.map((a)=>a.name);
    const registryFile = fs.readFileSync(path.resolve(__dirname, '..', 'actionRegistry.ts'), 'utf8');
    const publicContracts = fs.readFileSync(path.resolve(__dirname, '..', 'contracts', 'publicContracts.ts'), 'utf8');
    const clientContracts = fs.readFileSync(path.resolve(__dirname, '..', 'contracts', 'clientContracts.ts'), 'utf8');
    const adminContracts = fs.readFileSync(path.resolve(__dirname, '..', 'contracts', 'adminContracts.ts'), 'utf8');
    const contractsText = publicContracts + clientContracts + adminContracts;
    const missingHandlers = names.filter((n) => !registryFile.includes("'" + n + "'"));
    const missingContracts = names.filter((n) => !contractsText.includes(n + ': { validate:'));

    const files = walk(path.resolve(__dirname, '../..'));
    const forbiddenTokensFound: string[] = [];
    const forbidden = [new RegExp('TO'+'DO', 'i'), new RegExp('place'+'holder', 'i'), new RegExp('not impl'+'emented', 'i')];
    for (const file of files) {
      const c = fs.readFileSync(file, 'utf8');
      for (const rx of forbidden) {
        if (rx.test(c)) forbiddenTokensFound.push(file + ':' + rx.source);
      }
    }
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
