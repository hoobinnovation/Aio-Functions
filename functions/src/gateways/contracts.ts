import { ActionContract } from './types';
import { publicContracts } from './contracts/publicContracts';
import { clientContracts } from './contracts/clientContracts';
import { adminContracts } from './contracts/adminContracts';

export const allContracts: Record<string, ActionContract> = {
  ...publicContracts,
  ...clientContracts,
  ...adminContracts,
};
