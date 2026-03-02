import { actionRegistry } from './actionRegistry';
import { ActionRegistryItem } from './types';

export const PUBLIC_ACTIONS: Record<string, ActionRegistryItem> = Object.fromEntries(
  Object.entries(actionRegistry).filter(([, entry]) => entry.gateway === 'public'),
);
