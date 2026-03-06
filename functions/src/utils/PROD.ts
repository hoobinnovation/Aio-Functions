// functions/src/utils/PROD.ts
const isEmulator =
    process.env.FUNCTIONS_EMULATOR === "true" ||
    !!process.env.FIREBASE_EMULATOR_HUB ||
    process.env.NODE_ENV === "development";

const PROD = !isEmulator && process.env.NODE_ENV === "production";
export default PROD;