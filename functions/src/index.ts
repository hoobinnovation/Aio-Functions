import * as adminSdk from 'firebase-admin';
import {https} from "firebase-functions"
import './core/specs';
import { publicGateway } from './gateways/publicGateway';
import { clientGateway } from './gateways/clientGateway';
import { adminGateway } from './gateways/adminGateway';
import { storageThumbnails_onFinalize } from './triggers/storageThumbnails_onFinalize';
import {publicDevSeedDummyData} from "./actions/handlers/public/dev/publicDevSeedDummyData";
import {getInitializedDataSource} from "./core/db";
import {createLogger} from "./core/logging";

adminSdk.initializeApp();
export const demo =https.onRequest(async (req,resp) => {
    try {
        const db = await getInitializedDataSource(true);
        const logger = createLogger(`test`);

        await publicDevSeedDummyData({
            requestId: 'x',
            serverTime: Date.now()+"",
            uid: undefined,
            storeId:'1',
            gateway: 'public',
            db,
            logger,
            //@ts-ignore
        }, {seedKey:'1',});
        resp.send(true);
    }
    catch (e) {
        resp.send(e)
    }
})

export {
  publicGateway as public,
  clientGateway as client,
  adminGateway as admin,
  storageThumbnails_onFinalize,
};
