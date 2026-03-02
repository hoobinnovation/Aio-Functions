import { setGlobalOptions } from 'firebase-functions/v2';
import { publicGateway } from './gateways/public';
import { client } from './gateways/client';
import { admin } from './gateways/admin';
import { storageThumbnails_onFinalize } from './triggers/storageThumbnails';

setGlobalOptions({ region: 'us-central1', memory: '256MiB', timeoutSeconds: 60, maxInstances: 20 });

export {
  publicGateway as public,
  client,
  admin,
  storageThumbnails_onFinalize,
};
