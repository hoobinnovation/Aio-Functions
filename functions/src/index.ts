import * as adminSdk from 'firebase-admin';
import { onRequest} from "firebase-functions/v2/https"
import './core/specs';
import { publicGateway } from './gateways/publicGateway';
import { clientGateway } from './gateways/clientGateway';
import { adminGateway } from './gateways/adminGateway';
import { storageThumbnails_onFinalize } from './triggers/storageThumbnails_onFinalize';
import {getInitializedDataSource} from "./core/db";

adminSdk.initializeApp();

export {
  publicGateway as public,
  clientGateway as client,
  adminGateway as admin,
  storageThumbnails_onFinalize,
};
export const init = onRequest({timeoutSeconds: 300,memory:"512MiB"},async (req,resp) => {
    try {
        await getInitializedDataSource(true)
        resp.send(true)
    }
    catch (e) {
        resp.send(e)
    }
})
