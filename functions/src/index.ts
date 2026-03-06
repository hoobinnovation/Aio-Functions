import * as adminSdk from "firebase-admin";
import { https } from "firebase-functions";

import "./core/specs";
import { publicGateway } from "./gateways/publicGateway";
import { clientGateway } from "./gateways/clientGateway";
import { adminGateway } from "./gateways/adminGateway";
import { storageThumbnails_onFinalize } from "./triggers/storageThumbnails_onFinalize";

import { publicDevSeedDummyData } from "./actions/handlers/public/dev/publicDevSeedDummyData";
import { getInitializedDataSource } from "./core/db";
import { createLogger } from "./core/logging";

adminSdk.initializeApp();

/**
 * ✅ للتجربة: يعمل Seed لبيانات وأوردرات وهمية
 * افتحه من:
 * http://localhost:5001/<PROJECT_ID>/us-central1/demo?storeId=1&seedKey=1
 */
export const demo = https.onRequest(async (req, resp) => {
    try {
        const storeId = String(req.query.storeId || "1");
        const seedKey = String(req.query.seedKey || "1");

        const db = await getInitializedDataSource(true);
        const logger = createLogger("demo");

        await publicDevSeedDummyData(
            {
                requestId: "demo",
                serverTime: Date.now() + "",
                uid: undefined,
                storeId,
                gateway: "public",
                db,
                logger,
                // @ts-ignore
            },
            { seedKey }
        );

        resp.json({ ok: true });
    } catch (e: any) {
        resp.status(500).json({ ok: false, message: e?.message || String(e), stack: e?.stack || null });
    }
});

export {
    publicGateway as public,
    clientGateway as client,
    adminGateway as admin,
    storageThumbnails_onFinalize,
};