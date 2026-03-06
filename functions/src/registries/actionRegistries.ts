import { ActionHandler } from '../core/protocol';
import { registryAdmin, registryClient, registryPublic } from '../gateways/registries';
import { Gateway } from '../protocol/envelopes';
import { ADMIN_ACTION_REGISTRY } from './admin';

function toRecord(map: Map<string, ActionHandler>): Record<string, ActionHandler> {
  return Object.fromEntries(map.entries());
}

export const ACTION_REGISTRIES: Record<Gateway, Record<string, ActionHandler>> = {
  public: toRecord(registryPublic),
  client: toRecord(registryClient),
  admin: { ...toRecord(registryAdmin), ...ADMIN_ACTION_REGISTRY },
};
