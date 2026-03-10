import { v4 as uuidv4 } from 'uuid';
import { EntityManager } from 'typeorm';
import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { Category } from '../../entities/Category';
import { Product } from '../../entities/Product';
import { ProductImage } from '../../entities/ProductImage';
import { MediaAsset } from '../../entities/MediaAsset';
import { SeoSetting } from '../../entities/SeoSetting';
import { SitemapRun } from '../../entities/SitemapRun';
import { Store } from '../../entities/Store';
import { StoreSettings } from '../../entities/StoreSettings';
import { LandingPage } from '../../entities/LandingPage';
import { CashbackOffer } from '../../entities/CashbackOffer';
import { resolveMediaPublicUrl } from '../../utils/mediaPublicUrl';
import { parseFeatureVisibilityJson } from './storeFeatureVisibility';

export type SeoArtifactKey = 'robots' | 'index' | 'products' | 'categories' | 'pages' | 'images';

type SeoArtifactResponse = {
  key: SeoArtifactKey;
  filename: string;
  mimeType: 'text/plain' | 'application/xml';
  content: string;
  urlsCount: number;
};

type SitemapEntry = {
  loc: string;
  lastmod?: string;
};

type SitemapImageEntry = {
  loc: string;
  lastmod?: string;
  images: string[];
};

const ACTIVE_STATUSES = new Set(['active', 'published', 'ready']);

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function isValidAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function toIsoDate(date: Date | string | null | undefined, fallbackIso: string): string {
  if (!date) return fallbackIso;
  const value = typeof date === 'string' ? new Date(date) : date;
  return Number.isNaN(value.getTime()) ? fallbackIso : value.toISOString();
}

function xmlUrlset(entries: SitemapEntry[]): string {
  const body = entries.map((entry: SitemapEntry) => {
    const lastmodXml = entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
    return `<url><loc>${escapeXml(entry.loc)}</loc>${lastmodXml}</url>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

function xmlImageSitemap(entries: SitemapImageEntry[]): string {
  const body = entries.map((entry: SitemapImageEntry) => {
    const lastmodXml = entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
    const imagesXml = entry.images.map((url: string) => `<image:image><image:loc>${escapeXml(url)}</image:loc></image:image>`).join('');
    return `<url><loc>${escapeXml(entry.loc)}</loc>${lastmodXml}${imagesXml}</url>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${body}</urlset>`;
}

function xmlSitemapIndex(entries: SitemapEntry[]): string {
  const body = entries.map((entry: SitemapEntry) => {
    const lastmodXml = entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
    return `<sitemap><loc>${escapeXml(entry.loc)}</loc>${lastmodXml}</sitemap>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}

function buildRobotsTxt(baseUrl: string): string {
  return `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`;
}

function extractBaseUrlFromSeoSettings(seoRows: SeoSetting[]): string | null {
  for (const row of seoRows) {
    const extra = row.extra;
    if (!extra || typeof extra !== 'object') continue;

    const maybeBaseUrl = [
      (extra as Record<string, unknown>).baseUrl,
      (extra as Record<string, unknown>).canonicalBaseUrl,
      (extra as Record<string, unknown>).domain,
      (extra as Record<string, unknown>).siteUrl,
    ].find((candidate: unknown) => typeof candidate === 'string' && candidate.trim().length > 0) as string | undefined;

    if (maybeBaseUrl && isValidAbsoluteHttpUrl(maybeBaseUrl.trim())) {
      return normalizeBaseUrl(maybeBaseUrl.trim());
    }
  }

  return null;
}

function fallbackBaseUrl(storeId: string): string {
  const host = process.env.SEO_FALLBACK_ROOT_DOMAIN || 'example.com';
  const safeStoreId = storeId.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'store';
  return `https://${safeStoreId}.${host}`;
}

async function resolveBaseUrl(ctx: ActionContext, store: Store, seoRows: SeoSetting[]): Promise<string> {
  const envUrl = process.env.SEO_BASE_URL || process.env.PUBLIC_BASE_URL;
  if (envUrl && isValidAbsoluteHttpUrl(envUrl)) {
    return normalizeBaseUrl(envUrl);
  }

  const fromSeo = extractBaseUrlFromSeoSettings(seoRows);
  if (fromSeo) {
    return fromSeo;
  }

  const settings = await ctx.db.getRepository(StoreSettings).findOneBy({ storeId: store.id });
  if (settings) {
    const features = parseFeatureVisibilityJson(settings.featureVisibilityJson);
    const fromFeatures = Object.keys(features).find((key: string) => key.startsWith('seo.base_url:'));
    if (fromFeatures) {
      const maybe = fromFeatures.slice('seo.base_url:'.length);
      if (isValidAbsoluteHttpUrl(maybe)) {
        return normalizeBaseUrl(maybe);
      }
    }
  }

  return fallbackBaseUrl(store.id);
}

function isIndexableStatus(status: string | null | undefined, includeInactive: boolean): boolean {
  if (includeInactive) return true;
  return ACTIVE_STATUSES.has((status ?? '').toLowerCase());
}

function shouldIncludePage(path: string, pageSeoRow?: SeoSetting): boolean {
  if (!pageSeoRow?.extra || typeof pageSeoRow.extra !== 'object') return true;
  const extra = pageSeoRow.extra as Record<string, unknown>;
  if (extra.noindex === true) return false;
  if (extra.excludeFromSitemap === true) return false;
  if (extra.disabled === true) return false;
  if (extra.path && typeof extra.path === 'string' && extra.path !== path) return false;
  return true;
}

async function offersEnabled(ctx: ActionContext, storeId: string): Promise<boolean> {
  const activeCashback = await ctx.db.getRepository(CashbackOffer).count({ where: { storeId, status: 'active' } });
  if (activeCashback > 0) return true;

  const settings = await ctx.db.getRepository(StoreSettings).findOneBy({ storeId });
  if (!settings?.featureVisibilityJson) return false;
  const visibility = parseFeatureVisibilityJson(settings.featureVisibilityJson);
  return visibility.offers === true || visibility['page.offers'] === true;
}

export async function exportStoreSeoArtifacts(ctx: ActionContext, payload: any) {
  const storeId = ctx.storeId ?? payload.storeId;
  if (!storeId) throw new AppError('VALIDATION_FAILED', 'storeId is required');
  if (ctx.storeId && payload.storeId && payload.storeId !== ctx.storeId) {
    throw new AppError('STORE_ACCESS_REQUIRED', 'storeId is outside authenticated scope');
  }

  const includeInactive = Boolean(payload.includeInactive ?? false);
  const includeEmpty = Boolean(payload.includeEmpty ?? false);
  const artifactKey = (payload.artifact ?? 'all') as SeoArtifactKey | 'all';

  const store = await ctx.db.getRepository(Store).findOneBy({ id: storeId }) as Store | null;
  if (!store) throw new AppError('NOT_FOUND', 'Store not found');

  const generatedAt = new Date().toISOString();
  const seoRows = await ctx.db.getRepository(SeoSetting).find({ where: { storeId } }) as SeoSetting[];
  const baseUrl = await resolveBaseUrl(ctx, store, seoRows);

  const categoriesAll = await ctx.db.getRepository(Category).find({ where: { storeId } }) as Category[];
  const categories = categoriesAll
    .filter((row: Category) => (row.slug ?? '').trim().length > 0)
    .filter((row: Category) => isIndexableStatus(row.status, includeInactive));

  const indexedCategoryIds = new Set(categories.map((c: Category) => c.id));

  const productsAll = await ctx.db.getRepository(Product).find({ where: { storeId } }) as Product[];
  const products = productsAll
    .filter((row: Product) => (row.slug ?? '').trim().length > 0)
    .filter((row: Product) => isIndexableStatus(row.status, includeInactive))
    .filter((row: Product) => !row.categoryId || indexedCategoryIds.has(row.categoryId));

  const indexableProductsById = new Map(products.map((p: Product) => [p.id, p]));

  const productEntries: SitemapEntry[] = products.map((product: Product) => ({
    loc: joinUrl(baseUrl, `/product/${product.slug}`),
    lastmod: toIsoDate(product.updatedAt, generatedAt),
  }));

  const categoryEntries: SitemapEntry[] = categories.map((category: Category) => ({
    loc: joinUrl(baseUrl, `/category/${category.slug}`),
    lastmod: toIsoDate(category.updatedAt, generatedAt),
  }));

  const pageRowsByKey = new Map<string, SeoSetting>(seoRows.filter((row: SeoSetting) => row.pageType === 'page').map((row: SeoSetting) => [row.pageKey, row]));
  const staticPages: Array<{ key: string; path: string }> = [
    { key: 'home', path: '/' },
    { key: 'categories', path: '/categories' },
    { key: 'about', path: '/about' },
    { key: 'contact', path: '/contact' },
    { key: 'shipping', path: '/shipping' },
    { key: 'returns', path: '/returns' },
    { key: 'privacy', path: '/privacy' },
    { key: 'terms', path: '/terms' },
  ];

  if (await offersEnabled(ctx, storeId)) {
    staticPages.push({ key: 'offers', path: '/offers' });
  }

  const landingPagesAll = await ctx.db.getRepository(LandingPage).find({ where: { storeId } }) as LandingPage[];
  const landingPages = landingPagesAll.filter((page: LandingPage) => includeInactive || page.status === 'published');

  const pageEntries: SitemapEntry[] = [
    ...staticPages
      .filter((page: { key: string; path: string }) => shouldIncludePage(page.path, pageRowsByKey.get(page.key)))
      .map((page: { key: string; path: string }) => ({
        loc: joinUrl(baseUrl, page.path),
        lastmod: toIsoDate(store.updatedAt, generatedAt),
      })),
    ...landingPages
      .filter((page: LandingPage) => (page.slug ?? '').trim().length > 0)
      .map((page: LandingPage) => ({
        loc: joinUrl(baseUrl, `/${page.slug}`),
        lastmod: toIsoDate(page.updatedAt, generatedAt),
      })),
  ];

  const indexableProductIds = [...indexableProductsById.keys()];
  const productImagesAll = await ctx.db.getRepository(ProductImage).find({ order: { sortOrder: 'ASC' as any } }) as ProductImage[];
  const productImages = productImagesAll.filter((row: ProductImage) => indexableProductIds.includes(row.productId));

  const mediaIds = [...new Set(productImages.map((row: ProductImage) => row.mediaAssetId))];
  const mediaRowsAll = mediaIds.length > 0 ? await ctx.db.getRepository(MediaAsset).find() as MediaAsset[] : [];
  const mediaRows = mediaRowsAll.filter((row: MediaAsset) => mediaIds.includes(row.id));
  const mediaById = new Map(mediaRows.map((row: MediaAsset) => [row.id, row]));

  const imagesByProduct = new Map<string, string[]>();
  for (const relation of productImages) {
    const product = indexableProductsById.get(relation.productId);
    if (!product) continue;

    const media = mediaById.get(relation.mediaAssetId);
    if (!media) continue;
    if (!includeInactive && media.status !== 'ready') continue;

    const imageUrl = resolveMediaPublicUrl(media.thumbnailPath ?? media.originalPath);
    if (!imageUrl || !isValidAbsoluteHttpUrl(imageUrl)) continue;

    const current = imagesByProduct.get(relation.productId) ?? [];
    if (!current.includes(imageUrl)) {
      current.push(imageUrl);
      imagesByProduct.set(relation.productId, current);
    }
  }

  const imageEntries: SitemapImageEntry[] = products
    .map((product: Product) => ({
      loc: joinUrl(baseUrl, `/product/${product.slug}`),
      lastmod: toIsoDate(product.updatedAt, generatedAt),
      images: imagesByProduct.get(product.id) ?? [],
    }))
    .filter((entry: SitemapImageEntry) => entry.images.length > 0);

  const artifacts: Record<SeoArtifactKey, SeoArtifactResponse> = {
    robots: {
      key: 'robots',
      filename: 'robots.txt',
      mimeType: 'text/plain',
      content: buildRobotsTxt(baseUrl),
      urlsCount: 0,
    },
    products: {
      key: 'products',
      filename: 'sitemap-products.xml',
      mimeType: 'application/xml',
      content: xmlUrlset(productEntries),
      urlsCount: productEntries.length,
    },
    categories: {
      key: 'categories',
      filename: 'sitemap-categories.xml',
      mimeType: 'application/xml',
      content: xmlUrlset(categoryEntries),
      urlsCount: categoryEntries.length,
    },
    pages: {
      key: 'pages',
      filename: 'sitemap-pages.xml',
      mimeType: 'application/xml',
      content: xmlUrlset(pageEntries),
      urlsCount: pageEntries.length,
    },
    images: {
      key: 'images',
      filename: 'sitemap-images.xml',
      mimeType: 'application/xml',
      content: xmlImageSitemap(imageEntries),
      urlsCount: imageEntries.reduce((sum: number, entry: SitemapImageEntry) => sum + entry.images.length, 0),
    },
    index: {
      key: 'index',
      filename: 'sitemap.xml',
      mimeType: 'application/xml',
      content: '',
      urlsCount: 0,
    },
  };

  const indexChildren: SitemapEntry[] = [artifacts.products, artifacts.categories, artifacts.pages, artifacts.images]
    .filter((artifact: SeoArtifactResponse) => includeEmpty || artifact.urlsCount > 0)
    .map((artifact: SeoArtifactResponse) => ({
      loc: joinUrl(baseUrl, `/${artifact.filename}`),
      lastmod: generatedAt,
    }));

  artifacts.index.content = xmlSitemapIndex(indexChildren);
  artifacts.index.urlsCount = indexChildren.length;

  const selected: SeoArtifactResponse[] = artifactKey === 'all'
    ? [artifacts.robots, artifacts.index, artifacts.products, artifacts.categories, artifacts.pages, artifacts.images]
    : [artifacts[artifactKey]];

  await ctx.db.transaction(async (tx: EntityManager) => {
    await tx.getRepository(SitemapRun).save(tx.getRepository(SitemapRun).create({
      id: uuidv4(),
      storeId,
      status: 'completed',
      urlsCount: selected.reduce((sum: number, artifact: SeoArtifactResponse) => sum + artifact.urlsCount, 0),
    }));
  });

  if (artifactKey === 'all') {
    return {
      ok: true,
      storeId,
      baseUrl,
      generatedAt,
      artifacts: selected,
    };
  }

  const single = selected[0];
  return {
    ok: true,
    storeId,
    baseUrl,
    generatedAt,
    filename: single.filename,
    mimeType: single.mimeType,
    content: single.content,
    urlsCount: single.urlsCount,
    artifact: single,
  };
}
