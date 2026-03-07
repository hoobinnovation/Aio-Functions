import { onCall } from "firebase-functions/v2/https";
import { AppError } from "../core/errors";
import { getInitializedDataSource } from "../core/db";
import { createLogger } from "../core/logging";
import { rbacCheckOrThrow } from "../core/rbac";
import { registryAdmin } from "./registries";
import {
    executeWithProtocol,
    responseMeta,
    validateActionPayload,
    validateEnvelope,
} from "./helpers";

export const adminGateway = onCall(async (request: any) => {
    const meta = responseMeta();
    const logger = createLogger(`admin:${meta.requestId}`);

    return executeWithProtocol(async () => {
        if (!request.auth?.uid) {
            throw new AppError("UNAUTHENTICATED", "Authentication required");
        }

        const envelope = validateEnvelope(request.data);

        const rawPayload: any =
            envelope.payload && typeof envelope.payload === "object"
                ? { ...envelope.payload }
                : {};

        if (envelope.storeId && !rawPayload.storeId) {
            rawPayload.storeId = String(envelope.storeId);
        }

        const handler = registryAdmin.get(envelope.action);
        if (!handler) {
            throw new AppError("ACTION_NOT_FOUND", `Unknown action ${envelope.action}`);
        }

        const payload = validateActionPayload(envelope.action, rawPayload);

        const db = await getInitializedDataSource();

        const rbacStoreId =
            envelope.storeId ||
            (payload && typeof payload === "object" ? (payload as any).storeId : undefined);

        await rbacCheckOrThrow(db, request.auth.uid, envelope.action, rbacStoreId);

        return handler(
            {
                requestId: meta.requestId,
                serverTime: meta.serverTime,
                uid: request.auth.uid,
                storeId: envelope.storeId,
                gateway: "admin",
                db,
                logger,
            },
            payload
        );
    }, meta);
});