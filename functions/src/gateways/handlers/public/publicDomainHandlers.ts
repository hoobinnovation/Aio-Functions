import { ActionHandler } from '../../types';
import { genericActionHandler } from '../shared';

export const publicCatalogGetHome: ActionHandler = genericActionHandler('public', 'publicCatalogGetHome');
export const publicCatalogGetCategories: ActionHandler = genericActionHandler('public', 'publicCatalogGetCategories');
export const publicCatalogListProducts: ActionHandler = genericActionHandler('public', 'publicCatalogListProducts');
export const publicCatalogSearchProducts: ActionHandler = genericActionHandler('public', 'publicCatalogSearchProducts');
export const publicCatalogGetFilters: ActionHandler = genericActionHandler('public', 'publicCatalogGetFilters');
export const publicProductGetById: ActionHandler = genericActionHandler('public', 'publicProductGetById');
export const publicProductGetBySlug: ActionHandler = genericActionHandler('public', 'publicProductGetBySlug');
export const publicCategoryGetById: ActionHandler = genericActionHandler('public', 'publicCategoryGetById');
export const publicCategoryGetBySlug: ActionHandler = genericActionHandler('public', 'publicCategoryGetBySlug');
export const publicSeoGetPageMeta: ActionHandler = genericActionHandler('public', 'publicSeoGetPageMeta');
export const publicSeoGetLanding: ActionHandler = genericActionHandler('public', 'publicSeoGetLanding');

export const handlers: Record<string, ActionHandler> = {
  publicCatalogGetHome,
  publicCatalogGetCategories,
  publicCatalogListProducts,
  publicCatalogSearchProducts,
  publicCatalogGetFilters,
  publicProductGetById,
  publicProductGetBySlug,
  publicCategoryGetById,
  publicCategoryGetBySlug,
  publicSeoGetPageMeta,
  publicSeoGetLanding,
};
