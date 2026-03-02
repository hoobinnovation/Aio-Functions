import Joi from 'joi';
import { invalidArgument } from './errors';

export const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });
export const phoneSchema = Joi.string().pattern(/^[+0-9\-\s]{7,20}$/);

export const validatePayload = <T>(schema: Joi.ObjectSchema<T>, input: unknown): T => {
  const result = schema.validate(input, { abortEarly: false, stripUnknown: true, convert: true });
  if (result.error) {
    invalidArgument(result.error.details.map((d) => d.message).join(', '));
  }
  return result.value;
};
