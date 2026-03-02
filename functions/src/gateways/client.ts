import { onCall } from 'firebase-functions/v2/https';
import { dispatchGateway } from './dispatch';
import { CLIENT_ACTIONS } from './registry.client';

export const client = onCall(async (request) => dispatchGateway({ request, registry: CLIENT_ACTIONS, gateway: 'client' }));
