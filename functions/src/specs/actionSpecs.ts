import Joi from 'joi';
import '../core/specs';
import { ACTION_SPECS as LEGACY_ACTION_SPECS, ActionSpec } from '../core/validate';
import { Gateway } from '../protocol/envelopes';
import { ACTION_CATALOGS } from '../actions/catalogs';
import { ADMIN_ACTION_SPECS } from './admin';
import { DELIVERY_ACTION_SPECS } from './delivery';

type GatewaySpecs = Record<string, ActionSpec>;

function withPublicStoreErrors(spec: ActionSpec): ActionSpec {
    const errorCodes = Array.from(new Set([...(spec.errorCodes ?? []), 'PUBLIC_STORE_ID_REQUIRED', 'PUBLIC_STORE_ID_INVALID']));
    return {
        ...spec,
        errorCodes,
    };
}

function buildGatewaySpecs(gateway: Gateway): GatewaySpecs {
    return ACTION_CATALOGS[gateway].reduce<GatewaySpecs>((acc, action) => {
        const resolvedSpec =
            LEGACY_ACTION_SPECS[action] ??
            {
                schema: Joi.any().optional(),
                notes: 'Default payload',
                errorCodes: ['VALIDATION_FAILED'],
            };

        acc[action] = gateway === 'public' ? withPublicStoreErrors(resolvedSpec) : resolvedSpec;
        return acc;
    }, {});
}

export const ACTION_SPECS: Record<Gateway, GatewaySpecs> = {
  public: buildGatewaySpecs('public'),
  client: buildGatewaySpecs('client'),
  admin: { ...buildGatewaySpecs('admin'), ...ADMIN_ACTION_SPECS },
  delivery: { ...buildGatewaySpecs('delivery'), ...DELIVERY_ACTION_SPECS },
};
