import { v4 as uuidv4 } from 'uuid';

export function createRequestMeta() {
  return {
    requestId: uuidv4(),
    serverTime: new Date().toISOString(),
  };
}
