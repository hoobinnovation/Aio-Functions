import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ACTION_SPECS } from './actions-spec.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const gatewaysDir = path.join(root, 'gateways');

const byGateway = {
  public: ACTION_SPECS.filter((a) => a.gateway === 'public'),
  client: ACTION_SPECS.filter((a) => a.gateway === 'client'),
  admin: ACTION_SPECS.filter((a) => a.gateway === 'admin'),
};

const write = (p: string, c: string): void => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, c);
};

const contractFile = (gateway: 'public'|'client'|'admin') => {
  const actions = byGateway[gateway].map((a) => `  ${a.name}: { validate: (payload: unknown) => validatePayload(Joi.object({}).unknown(true), payload ?? {}) },`).join('\n');
  return `import Joi from 'joi';\nimport { validatePayload } from '../../lib/validators';\nimport { ActionContract } from '../types';\n\nexport const ${gateway}Contracts: Record<string, ActionContract> = {\n${actions}\n};\n`;
};

const ensureHandlerModules = (): void => {
  for (const g of ['public', 'client', 'admin'] as const) {
    const modules = Array.from(new Set(byGateway[g].map((a) => a.moduleName)));
    for (const moduleName of modules) {
      const p = path.join(gatewaysDir, 'handlers', g, `${moduleName}.ts`);
      if (fs.existsSync(p)) continue;
      write(p, `import { ActionHandler } from '../../types';\nimport { genericActionHandler } from '../shared';\n\nexport const handlers: Record<string, ActionHandler> = {};\n`);
    }
  }
};

const sharedHandlerFile = `
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
`;

const registryFile = (): string => {
  const imports: string[] = [
    `import { ActionRegistryItem } from './types';`,
    `import { publicContracts } from './contracts/publicContracts';`,
    `import { clientContracts } from './contracts/clientContracts';`,
    `import { adminContracts } from './contracts/adminContracts';`,
    `import { handlers as publicHealthHandlers } from './handlers/public/healthHandlers';`,
    `import { handlers as publicDomainHandlers } from './handlers/public/publicDomainHandlers';`,
    `import { handlers as clientHealthHandlers } from './handlers/client/healthHandlers';`,
    `import { handlers as clientDomainHandlers } from './handlers/client/clientDomainHandlers';`,
    `import { handlers as adminHealthHandlers } from './handlers/admin/healthHandlers';`,
    `import { handlers as adminDomainHandlers } from './handlers/admin/adminDomainHandlers';`,
  ];

  const lines = ACTION_SPECS.map((a) => {
    const contracts = `${a.gateway}Contracts`;
    const handlers = `${a.gateway}${a.moduleName === 'healthHandlers' ? 'HealthHandlers' : 'DomainHandlers'}`;
    return `  '${a.name}': { gateway: '${a.gateway}', requiresAuth: ${a.requiresAuth}, requiresStore: ${a.requiresStore}, contract: ${contracts}['${a.name}'], handler: ${handlers}['${a.name}'] },`;
  }).join('\n');

  return `${imports.join('\n')}\n\nexport const actionRegistry: Record<string, ActionRegistryItem> = {\n${lines}\n};\n`;
};

const fillHandlers = (gateway: 'public'|'client'|'admin', moduleName: string): void => {
  const actions = byGateway[gateway].filter((a) => a.moduleName === moduleName);
  const p = path.join(gatewaysDir, 'handlers', gateway, `${moduleName}.ts`);
  const content = `import { ActionHandler } from '../../types';\nimport { genericActionHandler } from '../shared';\n\n${actions.map((a)=>`export const ${a.name}: ActionHandler = genericActionHandler('${gateway}', '${a.name}');`).join('\n')}\n\nexport const handlers: Record<string, ActionHandler> = {\n${actions.map((a)=>`  ${a.name},`).join('\n')}\n};\n`;
  write(p, content);
};

write(path.join(gatewaysDir, 'contracts', 'publicContracts.ts'), contractFile('public'));
write(path.join(gatewaysDir, 'contracts', 'clientContracts.ts'), contractFile('client'));
write(path.join(gatewaysDir, 'contracts', 'adminContracts.ts'), contractFile('admin'));
ensureHandlerModules();
write(path.join(gatewaysDir, 'handlers', 'shared.ts'), sharedHandlerFile.trimStart());
fillHandlers('public', 'healthHandlers');
fillHandlers('public', 'publicDomainHandlers');
fillHandlers('client', 'healthHandlers');
fillHandlers('client', 'clientDomainHandlers');
fillHandlers('admin', 'healthHandlers');
fillHandlers('admin', 'adminDomainHandlers');
write(path.join(gatewaysDir, 'actionRegistry.ts'), registryFile());
console.log(`generated ${ACTION_SPECS.length} actions`);
