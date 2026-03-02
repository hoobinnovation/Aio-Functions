import { onCall } from 'firebase-functions/v2/https';
import { dispatchGateway } from './dispatch';
import { PUBLIC_ACTIONS } from './registry.public';

export const publicGateway = onCall(async (request) => dispatchGateway({ request, registry: PUBLIC_ACTIONS, gateway: 'public' }));
