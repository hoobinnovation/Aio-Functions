import { ActionHandler } from '../../types';
import { genericActionHandler } from '../shared';

export const publicHealthPing: ActionHandler = genericActionHandler('public', 'publicHealthPing');
export const publicActionsList: ActionHandler = genericActionHandler('public', 'publicActionsList');

export const handlers: Record<string, ActionHandler> = {
  publicHealthPing,
  publicActionsList,
};
