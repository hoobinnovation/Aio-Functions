import { setGlobalOptions } from 'firebase-functions/v2';
import { publicGateway } from './gateways/publicGateway';
import { client } from './gateways/clientGateway';
import { admin } from './gateways/adminGateway';
import { storageThumbnails } from './triggers/storageThumbnails';

setGlobalOptions({ region: 'us-central1', memory: '256MiB', timeoutSeconds: 60, maxInstances: 20 });

export {
  publicGateway as public,
  client,
  admin,
  storageThumbnails,
};
