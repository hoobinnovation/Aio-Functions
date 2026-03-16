import * as adminSdk from 'firebase-admin';
import {onRequest} from "firebase-functions/v2/https"
import './core/specs';
import { publicGateway } from './gateways/publicGateway';
import { clientGateway } from './gateways/clientGateway';
import { adminGateway } from './gateways/adminGateway';
import { webhookGateway } from './gateways/webhookGateway';
import { bootstrapCreateStoreWithOwner } from './actions/bootstraps/createStoreWithOwner';

import { storageThumbnails_onFinalize } from './triggers/storageThumbnails_onFinalize';
import {getInitializedDataSource} from "./core/db";


var serviceAccount = require("./service.json")

adminSdk.initializeApp({
    credential: adminSdk.credential.cert(serviceAccount),
    databaseURL: "https://aio-erp-sys-default-rtdb.firebaseio.com",
    storageBucket:"gs://aio-erp-sys.appspot.com"
});
export {
  publicGateway as public,
  clientGateway as client,
  adminGateway as admin,
  webhookGateway as webhook,
  storageThumbnails_onFinalize,
    bootstrapCreateStoreWithOwner as createStore
};
export const init = onRequest(async (req,resp) => {
    try {
        await getInitializedDataSource(true)
        resp.send(true)
    }
    catch (e) {
        resp.send(e)
    }
})
