import { ACTION_CATALOGS } from '../actions/catalogs';
import { ACTION_REGISTRIES } from '../registries/actionRegistries';

function coverage(gateway: 'public' | 'client' | 'admin') {
  const sot = new Set(ACTION_CATALOGS[gateway]);
  const implemented = new Set(Object.keys(ACTION_REGISTRIES[gateway]));
  return {
    missingHandlers: [...sot].filter((name) => !implemented.has(name)),
    extraHandlers: [...implemented].filter((name) => !sot.has(name)),
    implementedCount: implemented.size,
    sotCount: sot.size,
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
