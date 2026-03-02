import Joi from 'joi';
import { validatePayload } from '../../lib/validators';
import { ActionContract } from '../types';

export const publicContracts: Record<string, ActionContract> = {
  publicHealthPing: { validate: (payload: unknown) => validatePayload(Joi.object({}).unknown(true), payload ?? {}) },
  publicActionsList: { validate: (payload: unknown) => validatePayload(Joi.object({}).unknown(true), payload ?? {}) },
  publicCatalogGetHome: { validate: (payload: unknown) => validatePayload(Joi.object({}).unknown(true), payload ?? {}) },
  publicCatalogGetCategories: { validate: (payload: unknown) => validatePayload(Joi.object({}).unknown(true), payload ?? {}) },
  publicCatalogListProducts: { validate: (payload: unknown) => validatePayload(Joi.object({}).unknown(true), payload ?? {}) },
  publicCatalogSearchProducts: { validate: (payload: unknown) => validatePayload(Joi.object({}).unknown(true), payload ?? {}) },
  publicCatalogGetFilters: { validate: (payload: unknown) => validatePayload(Joi.object({}).unknown(true), payload ?? {}) },
  publicProductGetById: { validate: (payload: unknown) => validatePayload(Joi.object({}).unknown(true), payload ?? {}) },
  publicProductGetBySlug: { validate: (payload: unknown) => validatePayload(Joi.object({}).unknown(true), payload ?? {}) },
  publicCategoryGetById: { validate: (payload: unknown) => validatePayload(Joi.object({}).unknown(true), payload ?? {}) },
  publicCategoryGetBySlug: { validate: (payload: unknown) => validatePayload(Joi.object({}).unknown(true), payload ?? {}) },
  publicSeoGetPageMeta: { validate: (payload: unknown) => validatePayload(Joi.object({}).unknown(true), payload ?? {}) },
  publicSeoGetLanding: { validate: (payload: unknown) => validatePayload(Joi.object({}).unknown(true), payload ?? {}) },
};
