import { onCall } from 'firebase-functions/v2/https';
import { dispatchGateway } from './dispatch';
import { ADMIN_ACTIONS } from './registry.admin';

export const admin = onCall(async (request) => dispatchGateway({ request, registry: ADMIN_ACTIONS, gateway: 'admin' }));
