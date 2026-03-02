import { ActionHandler } from '../../types';
import { genericActionHandler } from '../shared';

export const adminHealthWhoAmI: ActionHandler = genericActionHandler('admin', 'adminHealthWhoAmI');
export const adminHealthDbCheck: ActionHandler = genericActionHandler('admin', 'adminHealthDbCheck');
export const adminActionsList: ActionHandler = genericActionHandler('admin', 'adminActionsList');
export const adminHealthActionsCoverage: ActionHandler = genericActionHandler('admin', 'adminHealthActionsCoverage');

export const handlers: Record<string, ActionHandler> = {
  adminHealthWhoAmI,
  adminHealthDbCheck,
  adminActionsList,
  adminHealthActionsCoverage,
};
