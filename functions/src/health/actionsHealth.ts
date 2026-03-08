import { ACTION_CATALOGS } from '../actions/catalogs';
import { ACTION_REGISTRIES } from '../registries/actionRegistries';
import { ACTION_SPECS } from '../specs/actionSpecs';
import { ACTION_ROLE_MAP } from '../core/rbac';
import { getAdminContractCoverage } from '../contracts/adminContractCharter';

function coverage(gateway: 'public' | 'client' | 'admin') {
  const sot = new Set(ACTION_CATALOGS[gateway]);
  const implemented = new Set(Object.keys(ACTION_REGISTRIES[gateway]));
  const specs = new Set(Object.keys(ACTION_SPECS[gateway]));
  const base = {
    missingHandlers: [...sot].filter((name) => !implemented.has(name)),
    extraHandlers: [...implemented].filter((name) => !sot.has(name)),
    missingSpecs: [...sot].filter((name) => !specs.has(name)),
    extraSpecs: [...specs].filter((name) => !sot.has(name)),
    implementedCount: implemented.size,
    sotCount: sot.size,
  };

  if (gateway !== 'admin') {
    return base;
  }

  const rbacSet = new Set(Object.keys(ACTION_ROLE_MAP));
  const adminCoverage = getAdminContractCoverage();

  return {
    ...base,
    missingRbac: [...sot].filter((name) => !rbacSet.has(name)),
    extraRbac: [...rbacSet].filter((name) => !sot.has(name)),
    contract: adminCoverage,
  };
}

export function adminHealthActionsCoverage() {
  return {
    public: coverage('public'),
    client: coverage('client'),
    admin: coverage('admin'),
  };
}

export function actionsListForGateway(gateway: 'public' | 'client' | 'admin') {
  return Object.keys(ACTION_REGISTRIES[gateway]).sort();
}
