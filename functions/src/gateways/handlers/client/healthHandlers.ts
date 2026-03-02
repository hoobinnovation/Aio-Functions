import { ActionHandler } from '../../types';
import { genericActionHandler } from '../shared';

export const clientHealthWhoAmI: ActionHandler = genericActionHandler('client', 'clientHealthWhoAmI');
export const clientActionsList: ActionHandler = genericActionHandler('client', 'clientActionsList');

export const handlers: Record<string, ActionHandler> = {
  clientHealthWhoAmI,
  clientActionsList,
};
