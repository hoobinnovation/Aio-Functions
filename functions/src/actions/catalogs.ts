import { PUBLIC_ACTIONS_SOT } from '../sot/publicActions';
import { CLIENT_ACTIONS_SOT } from '../sot/clientActions';
import { ADMIN_ACTIONS_SOT } from '../sot/adminActions';
import { DELIVERY_ACTIONS_SOT } from '../sot/deliveryActions';
import { Gateway } from '../protocol/envelopes';

export const ACTION_NAME_REGEX = /^[a-z][A-Za-z0-9]*$/;

export const ACTION_CATALOGS: Record<Gateway, readonly string[]> = {
  public: PUBLIC_ACTIONS_SOT,
  client: CLIENT_ACTIONS_SOT,
  admin: ADMIN_ACTIONS_SOT,
  delivery: DELIVERY_ACTIONS_SOT,
};

export function isValidActionName(action: string): boolean {
  return ACTION_NAME_REGEX.test(action);
}
