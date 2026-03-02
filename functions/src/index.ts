import { setGlobalOptions } from 'firebase-functions/v2';
import { publicGateway } from './gateways/publicGateway';
import { clientGateway } from './gateways/clientGateway';
import { adminGateway } from './gateways/adminGateway';
import { storageThumbnails } from './triggers/storageThumbnails';

setGlobalOptions({ region: 'us-central1', memory: '256MiB', timeoutSeconds: 60, maxInstances: 20 });

export {
  publicGateway,
  clientGateway,
  adminGateway,
  storageThumbnails,
};
