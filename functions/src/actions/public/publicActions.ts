import { ActionContext } from '../../core/protocol';
import { actionsListForGateway } from '../../health/actionsHealth';

export async function publicHealthPing(ctx: ActionContext) {
  return { pong: true, gateway: ctx.gateway };
}

export async function publicActionsList() {
  return {
    gateway: 'public',
    allowedActions: actionsListForGateway('public'),
  };
}
