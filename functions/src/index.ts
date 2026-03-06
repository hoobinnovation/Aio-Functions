import * as adminSdk from 'firebase-admin';
import './core/specs';
import { publicGateway } from './gateways/publicGateway';
import { clientGateway } from './gateways/clientGateway';
import { adminGateway } from './gateways/adminGateway';
import { storageThumbnails_onFinalize } from './triggers/storageThumbnails_onFinalize';

adminSdk.initializeApp();

export {
  publicGateway as public,
  clientGateway as client,
  adminGateway as admin,
  storageThumbnails_onFinalize,
};
