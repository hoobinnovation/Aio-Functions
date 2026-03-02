import { actionRegistry } from './actionRegistry';
import { ActionRegistryItem } from './types';

export const CLIENT_ACTIONS: Record<string, ActionRegistryItem> = Object.fromEntries(
  Object.entries(actionRegistry).filter(([, entry]) => entry.gateway === 'client'),
);
