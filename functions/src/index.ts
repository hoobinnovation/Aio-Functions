import * as adminSdk from 'firebase-admin';
import './core/specs';
import { publicGateway } from './gateways/publicGateway';
import { clientGateway } from './gateways/clientGateway';
import { adminGateway } from './gateways/adminGateway';
import { webhookGateway } from './gateways/webhookGateway';
import { storageThumbnails_onFinalize } from './triggers/storageThumbnails_onFinalize';
import {onRequest} from "firebase-functions/v1/https";
import {getInitializedDataSource} from "./core/db";
import path from "path";
import fs from "fs";

adminSdk.initializeApp()

export {
  publicGateway as public,
  clientGateway as client,
  adminGateway as admin,
  webhookGateway as webhook,
  storageThumbnails_onFinalize,
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
export const init2 = onRequest(async (req: any, resp: { send: (arg0: unknown) => void; }) => {
    try {
        const fs = require('fs');
        const path = require('path');

        const dataDir = path.join(__dirname, 'data');
        console.log(dataDir)
        // @ts-ignore
        function isJsonFile(fileName) {
            return path.extname(fileName).toLowerCase() === '.json' ||  path.extname(fileName).toLowerCase() === '.txt';
        }
        // @ts-ignore
        function safeReadJson(filePath) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(content);
            } catch (error) {
                console.error(`فشل قراءة/تحويل الملف: ${filePath}`);
                // @ts-ignore
                console.error(error.message);
                return null;
            }
        }
        // @ts-ignore
        function extractProductShapes(jsonData) {
            if (
                jsonData &&
                typeof jsonData === 'object' &&
                Array.isArray(jsonData.productShapes)
            ) {
                return jsonData.productShapes;
            }

            return [];
        }
        // @ts-ignore
        function processCategoryFolder(folderPath) {
            const items = fs.readdirSync(folderPath, { withFileTypes: true });

            const jsonFiles = items
                // @ts-ignore
                .filter((item) => item.isFile() && isJsonFile(item.name))
                // @ts-ignore
                .map((item) => item.name);

            const allProductShapes = [];

            for (const fileName of jsonFiles) {
                const filePath = path.join(folderPath, fileName);
                const jsonData = safeReadJson(filePath);

                if (!jsonData) {
                    continue;
                }

                const productShapes = extractProductShapes(jsonData);

                if (productShapes.length > 0) {
                    allProductShapes.push(...productShapes);
                }
            }

            const outputPath = path.join(folderPath, 'all-products.json');

            fs.writeFileSync(
                outputPath,
                JSON.stringify(allProductShapes, null, 2),
                'utf8'
            );

            console.log(
                `تم إنشاء الملف: ${outputPath} | عدد المنتجات: ${allProductShapes.length}`
            );
        }

        if (!fs.existsSync(dataDir)) {
            console.error(`فولدر data غير موجود: ${dataDir}`);
            return;
        }

        const entries = fs.readdirSync(dataDir, { withFileTypes: true });

        // @ts-ignore
        const subFolders = entries.filter((entry) => entry.isDirectory());

        for (const folder of subFolders) {
            const folderPath = path.join(dataDir, folder.name);
            console.log(`جاري معالجة الفولدر: ${folderPath}`);
            processCategoryFolder(folderPath);
        }

        console.log('تم الانتهاء.');

        resp.send(true)
    }
    catch (e) {
        resp.send(e)
    }
})
