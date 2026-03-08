import Joi from 'joi';
import '../core/specs';
import { ACTION_SPECS as LEGACY_ACTION_SPECS, ActionSpec } from '../core/validate';
import { Gateway } from '../protocol/envelopes';
import { ACTION_CATALOGS } from '../actions/catalogs';
import { ADMIN_ACTION_SPECS } from './admin';

type GatewaySpecs = Record<string, ActionSpec>;

function buildGatewaySpecs(gateway: Gateway): GatewaySpecs {
    return ACTION_CATALOGS[gateway].reduce<GatewaySpecs>((acc, action) => {
        acc[action] =
            LEGACY_ACTION_SPECS[action] ??
            {
                schema: Joi.any().optional(),
                notes: 'Default payload',
                errorCodes: ['VALIDATION_FAILED'],
            };
        return acc;
    }, {});
}

export const ACTION_SPECS: Record<Gateway, GatewaySpecs> = {
    public: buildGatewaySpecs('public'),
    client: buildGatewaySpecs('client'),
    admin: { ...buildGatewaySpecs('admin'), ...ADMIN_ACTION_SPECS },
};
