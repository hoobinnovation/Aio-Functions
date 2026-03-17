import * as adminSdk from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import './core/specs';
import { publicGateway } from './gateways/publicGateway';
import { publicDevGateway } from './gateways/publicDevGateway';
import { clientGateway } from './gateways/clientGateway';
import { adminGateway } from './gateways/adminGateway';
import { deliveryGateway } from './gateways/deliveryGateway';
import { webhookGateway } from './gateways/webhookGateway';
import { bootstrapCreateStoreWithOwner } from './actions/bootstraps/createStoreWithOwner';

import { storageThumbnails_onFinalize } from './triggers/storageThumbnails_onFinalize';
import { getInitializedDataSource } from './core/db';
import { sweepStaleRiderPresence } from './core/delivery/domain';

var serviceAccount = require('./service.json');

adminSdk.initializeApp({
    credential: adminSdk.credential.cert(serviceAccount),
    databaseURL: 'https://aio-erp-sys-default-rtdb.firebaseio.com',
    storageBucket: 'aio-erp-sys.appspot.com',
});

export {
    publicGateway as public,
    publicDevGateway as demo,
    clientGateway as client,
    adminGateway as admin,
    deliveryGateway as delivery,
    webhookGateway as webhook,
    storageThumbnails_onFinalize,
    bootstrapCreateStoreWithOwner as createStore,
};

export const init = onRequest(async (req, resp) => {
    try {
        await getInitializedDataSource(true);
        resp.send(true);
    } catch (e) {
        resp.send(e);
    }
});

export const deliveryPresenceSweep = onSchedule('every 5 minutes', async () => {
    const db = await getInitializedDataSource();
    const result = await sweepStaleRiderPresence({
        requestId: `delivery-sweep-${Date.now()}`,
        serverTime: new Date().toISOString(),
        gateway: 'delivery',
        runtime: 'cloud',
        meta: { scheduler: true },
        auth: {},
        db,
        logger: {
            info: (msg: string, data?: unknown) => console.log(msg, data),
            warn: (msg: string, data?: unknown) => console.warn(msg, data),
            error: (msg: string, data?: unknown) => console.error(msg, data),
        },
    } as any);
    console.log('deliveryPresenceSweep', result);
});
