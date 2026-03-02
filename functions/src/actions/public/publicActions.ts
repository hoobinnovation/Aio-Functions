import { ActionContext } from '../../core/protocol';
import { PUBLIC_ACTIONS_SOT } from '../../sot/publicActions';
import { registryPublic } from '../../gateways/registries';

export async function publicHealthPing(ctx: ActionContext) {
  return { pong: true, gateway: ctx.gateway };
}

export async function publicActionsList() {
  return {
    gateway: 'public',
    implementedActions: Array.from(registryPublic.keys()),
    sotActionsCount: PUBLIC_ACTIONS_SOT.length,
  };
}
