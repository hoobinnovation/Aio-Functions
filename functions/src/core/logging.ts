export function createLogger(scope: string) {
  return {
    info: (msg: string, data?: unknown) => console.log(`[${scope}] ${msg}`, data ?? ''),
    warn: (msg: string, data?: unknown) => console.warn(`[${scope}] ${msg}`, data ?? ''),
    error: (msg: string, data?: unknown) => console.error(`[${scope}] ${msg}`, data ?? ''),
  };
}
