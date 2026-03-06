import Joi from 'joi';
import { AppError } from './errors';

export const envelopeSchema = Joi.object({
  action: Joi.string().pattern(/^[a-z][A-Za-z0-9]*$/).required(),
  storeId: Joi.string().optional(),
  payload: Joi.any().optional(),
  meta: Joi.object().optional(),
}).required();

export interface ActionSpec {
  schema: any;
  notes: string;
  errorCodes: string[];
}

export const ACTION_SPECS: Record<string, ActionSpec> = {};

export function validateOrThrow(schema: any, value: unknown, code = 'VALIDATION_FAILED') {
  const { error, value: out } = schema.validate(value, { abortEarly: false, allowUnknown: false, stripUnknown: true });
  if (error) {
    throw new AppError(code, 'Validation failed', {
      issues: error.details.map((d: { message: string }) => d.message),
    });
  }
  return out;
}
