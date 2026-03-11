import { ActionContext } from '../../core/protocol';
import { AppError } from '../../core/errors';
import { Banner } from '../../entities/Banner';
import { Category } from '../../entities/Category';
import { FeaturedItem } from '../../entities/FeaturedItem';
import { HomeSection } from '../../entities/HomeSection';
import { MediaAsset } from '../../entities/MediaAsset';
import { Product } from '../../entities/Product';
import { ProductVariant } from '../../entities/ProductVariant';
import { StoreSettings } from '../../entities/StoreSettings';
import { resolveEffectiveProductMedia } from '../catalogResolver';

const adminSdk = require('firebase-admin') as any;

export const HOME_SECTION_TYPES = ['heroCarousel', 'categoryGrid', 'productRail', 'promoStrip', 'infoTiles'] as const;
export type HomeSectionType = (typeof HOME_SECTION_TYPES)[number];

export const HOME_COMPONENT_KEYS = [
  'heroDefault',
  'heroPromoSplit',
  'heroMinimal',
  'categoriesCompact',
  'categoriesRound',
  'categoriesLargeTiles',
  'productCarouselDefault',
  'productCarouselDense',
  'promoStripDefault',
  'promoStripGradient',
  'brandStoryDefault',
] as const;
export type HomeComponentKey = (typeof HOME_COMPONENT_KEYS)[number];

export const DEFAULT_COMPONENT_BY_TYPE: Record<HomeSectionType, HomeComponentKey> = {
  heroCarousel: 'heroDefault',
  categoryGrid: 'categoriesCompact',
  productRail: 'productCarouselDefault',
  promoStrip: 'promoStripDefault',
  infoTiles: 'brandStoryDefault',
};

export const COMPONENT_KEYS_BY_TYPE: Record<HomeSectionType, readonly HomeComponentKey[]> = {
  heroCarousel: ['heroDefault', 'heroPromoSplit', 'heroMinimal'],
  categoryGrid: ['categoriesCompact', 'categoriesRound', 'categoriesLargeTiles'],
  productRail: ['productCarouselDefault', 'productCarouselDense'],
  promoStrip: ['promoStripDefault', 'promoStripGradient'],
  infoTiles: ['brandStoryDefault'],
};

const SUPPORTED_MODES = ['live', 'preview'] as const;
export type HomeLayoutMode = (typeof SUPPORTED_MODES)[number];

export interface HomeLayoutSection {
  id: string;
  type: HomeSectionType;
  componentKey: HomeComponentKey;
  enabled: boolean;
  sortOrder: number;
  title: string | null;
  subtitle: string | null;
  analyticsKey: string | null;
  payload: Record<string, unknown>;
  visibility: Record<string, unknown> | null;
}

export interface HomeLayoutResponse {
  mode: HomeLayoutMode;
  storeId: string;
  sections: HomeLayoutSection[];
}

const HOME_RUNTIME_RTDB_ROOT = '/runtime/home/layouts';

interface ParsedSectionConfig {
  componentKey?: unknown;
  title?: unknown;
  subtitle?: unknown;
  analyticsKey?: unknown;
  payload?: Record<string, unknown>;
  visibility?: Record<string, unknown>;
  styleVariant?: unknown;
  modes?: unknown;
}

interface NormalizedHomeSection {
  id: string;
  storeId: string;
  type: HomeSectionType;
  componentKey: HomeComponentKey;
  enabled: boolean;
  sortOrder: number;
  title: string | null;
  subtitle: string | null;
  analyticsKey: string | null;
  payload: Record<string, unknown>;
  visibility: Record<string, unknown> | null;
  modes?: HomeLayoutMode[];
}

function normalizeMode(input: unknown): HomeLayoutMode {
  if (typeof input !== 'string') return 'live';
  if ((SUPPORTED_MODES as readonly string[]).includes(input)) return input as HomeLayoutMode;
  return 'live';
}

function runtimeLayoutRef(storeId: string, mode: HomeLayoutMode): any {
  return adminSdk.database().ref(`${HOME_RUNTIME_RTDB_ROOT}/${storeId}/${mode}`);
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length ? value : null;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toLayoutModeArray(input: unknown): HomeLayoutMode[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const modes = input
    .map((it) => (typeof it === 'string' && (SUPPORTED_MODES as readonly string[]).includes(it) ? (it as HomeLayoutMode) : null))
    .filter((it): it is HomeLayoutMode => !!it);
  return modes.length ? modes : undefined;
}

export function isValidHomeSectionType(value: unknown): value is HomeSectionType {
  return typeof value === 'string' && (HOME_SECTION_TYPES as readonly string[]).includes(value);
}

export function isValidHomeComponentKey(value: unknown): value is HomeComponentKey {
  return typeof value === 'string' && (HOME_COMPONENT_KEYS as readonly string[]).includes(value);
}

export function assertTypeComponentCompatibility(type: HomeSectionType, componentKey: HomeComponentKey): void {
  if (!(COMPONENT_KEYS_BY_TYPE[type] as readonly string[]).includes(componentKey)) {
    throw new AppError('VALIDATION_FAILED', `componentKey ${componentKey} is not allowed for type ${type}`);
  }
}

export function normalizeSectionForWrite(payload: any): { type: HomeSectionType; config: Record<string, unknown> } {
  if (!isValidHomeSectionType(payload?.type)) {
    throw new AppError('VALIDATION_FAILED', 'Invalid home section type');
  }

  const incomingConfig = asObject(payload.config);
  const rawComponent = incomingConfig.componentKey;
  const componentKey = isValidHomeComponentKey(rawComponent)
    ? rawComponent
    : DEFAULT_COMPONENT_BY_TYPE[payload.type as HomeSectionType];

  assertTypeComponentCompatibility(payload.type, componentKey);

  const cleanConfig: Record<string, unknown> = {
    ...incomingConfig,
    componentKey,
  };

  return { type: payload.type, config: cleanConfig };
}

function normalizeStorageSection(row: HomeSection): NormalizedHomeSection | null {
  if (!isValidHomeSectionType(row.type)) return null;

  const cfg = asObject(row.config) as ParsedSectionConfig;
  const candidateComponent = cfg.componentKey;
  const componentKey = isValidHomeComponentKey(candidateComponent)
    ? candidateComponent
    : DEFAULT_COMPONENT_BY_TYPE[row.type];

  if (!(COMPONENT_KEYS_BY_TYPE[row.type] as readonly string[]).includes(componentKey)) {
    return null;
  }

  return {
    id: row.id,
    storeId: row.storeId,
    type: row.type,
    componentKey,
    enabled: !!row.enabled,
    sortOrder: Number(row.sortOrder || 0),
    title: asStringOrNull(cfg.title),
    subtitle: asStringOrNull(cfg.subtitle),
    analyticsKey: asStringOrNull(cfg.analyticsKey),
    payload: asObject(cfg.payload),
    visibility: asObject(cfg.visibility),
    modes: toLayoutModeArray(cfg.modes),
  };
}

function normalizeRuntimeSection(raw: unknown): NormalizedHomeSection | null {
  const row = asObject(raw);
  if (!isValidHomeSectionType(row.type)) return null;

  const componentKey = isValidHomeComponentKey(row.componentKey)
    ? row.componentKey
    : DEFAULT_COMPONENT_BY_TYPE[row.type];
  if (!(COMPONENT_KEYS_BY_TYPE[row.type] as readonly string[]).includes(componentKey)) return null;

  const payload = asObject(row.payload);
  return {
    id: asStringOrNull(row.id) ?? `runtime-${row.type}-${asNumber(row.sortOrder, 0)}`,
    storeId: asStringOrNull(row.storeId) ?? '',
    type: row.type,
    componentKey,
    enabled: row.enabled !== false,
    sortOrder: asNumber(row.sortOrder, 0),
    title: asStringOrNull(row.title),
    subtitle: asStringOrNull(row.subtitle),
    analyticsKey: asStringOrNull(row.analyticsKey),
    payload,
    visibility: asObject(row.visibility),
  };
}

interface BuildHomeDataContext {
  banners: Array<{ banner: Banner; media: MediaAsset | null }>;
  categories: Category[];
  productById: Map<string, Product>;
  productImageByProductId: Map<string, MediaAsset | null>;
  primaryVariantByProductId: Map<string, ProductVariant | null>;
  featuredProductIds: string[];
  storeSettings: StoreSettings | null;
}

async function loadHomeDataContext(ctx: ActionContext, storeId: string): Promise<BuildHomeDataContext> {
  const bannerRows = await ctx.db.getRepository(Banner).find({ where: { storeId, status: 'active' }, order: { sortOrder: 'ASC' as any } });
  const bannerMediaIds = bannerRows.map((b: Banner) => b.mediaAssetId);
  const bannerMediaRows = bannerMediaIds.length
    ? await ctx.db.getRepository(MediaAsset).findByIds(bannerMediaIds as any)
    : [];
  const bannerMediaMap = new Map<string, MediaAsset>(bannerMediaRows.map((m: MediaAsset) => [m.id, m] as const));

  const categories = await ctx.db.query("SELECT * FROM categories WHERE ((mode='global' AND storeId IS NULL) OR (mode='store' AND storeId=?)) AND status='active' ORDER BY sortOrder ASC", [storeId]);

  const featured = await ctx.db.getRepository(FeaturedItem).find({ where: { storeId }, order: { sortOrder: 'ASC' as any } });

  const products = await ctx.db.query("SELECT * FROM products WHERE ((mode='global' AND storeId IS NULL) OR (mode='store' AND storeId=?)) AND status='active' ORDER BY updatedAt DESC", [storeId]);
  const productById = new Map<string, Product>(products.map((p: Product) => [p.id, p] as const));

  const variants = products.length
    ? (await ctx.db.getRepository(ProductVariant).find({ where: { status: 'active' } as any, order: { updatedAt: 'DESC' as any } }))
      .filter((v: ProductVariant) => productById.has(v.productId))
    : [];

  const primaryVariantByProductId = new Map<string, ProductVariant | null>();
  for (const p of products) primaryVariantByProductId.set(p.id, null);
  for (const v of variants) {
    if (!primaryVariantByProductId.get(v.productId)) primaryVariantByProductId.set(v.productId, v);
  }

  const mediaByProductId = await resolveEffectiveProductMedia(ctx.db, storeId, products.map((p: Product) => p.id));
  const productMediaRows = mediaByProductId.size
    ? await ctx.db.getRepository(MediaAsset).findByIds(Array.from(new Set([...mediaByProductId.values()])) as any)
    : [];
  const productMediaMap = new Map<string, MediaAsset>(productMediaRows.map((m: MediaAsset) => [m.id, m] as const));
  const productImageByProductId = new Map<string, MediaAsset | null>();
  for (const p of products) {
    const mediaAssetId = mediaByProductId.get(p.id);
    productImageByProductId.set(p.id, mediaAssetId ? (productMediaMap.get(mediaAssetId) ?? null) : null);
  }

  const storeSettings = await ctx.db.getRepository(StoreSettings).findOneBy({ storeId });

  return {
    banners: bannerRows.map((banner: Banner) => ({ banner, media: bannerMediaMap.get(banner.mediaAssetId) ?? null })),
    categories,
    productById,
    productImageByProductId,
    primaryVariantByProductId,
    featuredProductIds: featured.map((f: FeaturedItem) => f.productId),
    storeSettings,
  };
}

function buildHeroPayload(section: NormalizedHomeSection, dataCtx: BuildHomeDataContext): Record<string, unknown> {
  const payloadSlides = Array.isArray(section.payload.slides) ? section.payload.slides : null;
  const slides = payloadSlides
    ? payloadSlides
    : dataCtx.banners.map(({ banner, media }, index) => ({
      id: banner.id,
      title: banner.title,
      subtitle: null,
      ctaLabel: null,
      ctaTarget: banner.linkUrl,
      badge: null,
      sortOrder: index,
      enabled: true,
      media: {
        assetId: media?.id ?? null,
        originalPath: media?.originalPath ?? null,
        thumbnailPath: media?.thumbnailPath ?? null,
      },
    }));

  return {
    ...section.payload,
    styleVariant: section.payload.styleVariant ?? section.componentKey,
    slides,
  };
}

function buildCategoryPayload(section: NormalizedHomeSection, dataCtx: BuildHomeDataContext): Record<string, unknown> {
  const limit = Math.max(1, asNumber(section.payload.limit, 8));
  const categories = dataCtx.categories.slice(0, limit).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    routeTarget: `/category/${category.slug}`,
    image: null,
    sortOrder: category.sortOrder,
    badge: null,
  }));

  return {
    ...section.payload,
    styleVariant: section.payload.styleVariant ?? section.componentKey,
    limit,
    categories,
  };
}

function pickProductIds(source: string, section: NormalizedHomeSection, dataCtx: BuildHomeDataContext): string[] {
  if (source === 'manualIds' || source === 'curated') {
    const manualIds = Array.isArray(section.payload.manualIds)
      ? section.payload.manualIds.filter((x): x is string => typeof x === 'string')
      : [];
    return manualIds;
  }
  if (source === 'featured') return dataCtx.featuredProductIds;
  const productIds = Array.from(dataCtx.productById.values()).map((p) => p.id);
  return productIds;
}

function buildProductRailPayload(section: NormalizedHomeSection, dataCtx: BuildHomeDataContext): Record<string, unknown> {
  const sourceRaw = typeof section.payload.source === 'string' ? section.payload.source : 'featured';
  const source = ['curated', 'featured', 'bestseller', 'recommended', 'latest', 'manualIds'].includes(sourceRaw)
    ? sourceRaw
    : 'featured';
  const limit = Math.max(1, asNumber(section.payload.limit, 12));
  const sortMode = typeof section.payload.sortMode === 'string' ? section.payload.sortMode : 'default';

  const ids = pickProductIds(source, section, dataCtx);
  const products = ids
    .map((id) => dataCtx.productById.get(id))
    .filter((p): p is Product => !!p)
    .slice(0, limit)
    .map((p) => {
      const variant = dataCtx.primaryVariantByProductId.get(p.id) ?? null;
      const compareAt = Number(variant?.attributes?.compareAtPriceCents ?? NaN);
      const media = dataCtx.productImageByProductId.get(p.id) ?? null;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: {
          assetId: media?.id ?? null,
          originalPath: media?.originalPath ?? null,
          thumbnailPath: media?.thumbnailPath ?? null,
        },
        price: variant ? Number(variant.priceCents) : null,
        compareAtPrice: Number.isFinite(compareAt) ? compareAt : null,
        currency: dataCtx.storeSettings?.currency ?? 'USD',
        inStock: variant ? variant.stockQty > 0 : false,
        ratingAverage: Number(p.ratingAverage ?? 0),
        popularityScore: Number(p.popularityScore ?? 0),
        favorite: {
          supported: true,
          toggleAction: 'productFavoritesToggle',
          listAction: 'productFavoritesList',
        },
        badge: null,
        subtitle: null,
        unit: typeof variant?.attributes?.unit === 'string' ? variant.attributes.unit : null,
      };
    });

  return {
    ...section.payload,
    styleVariant: section.payload.styleVariant ?? section.componentKey,
    source,
    sortMode,
    limit,
    products,
  };
}

function buildPromoStripPayload(section: NormalizedHomeSection): Record<string, unknown> {
  const content = typeof section.payload.content === 'string'
    ? section.payload.content
    : typeof section.payload.message === 'string'
      ? section.payload.message
      : null;

  return {
    ...section.payload,
    styleVariant: section.payload.styleVariant ?? section.componentKey,
    content,
    highlightedText: typeof section.payload.highlightedText === 'string' ? section.payload.highlightedText : null,
    ctaLabel: typeof section.payload.ctaLabel === 'string' ? section.payload.ctaLabel : null,
    ctaTarget: typeof section.payload.ctaTarget === 'string' ? section.payload.ctaTarget : null,
    dismissible: typeof section.payload.dismissible === 'boolean' ? section.payload.dismissible : false,
  };
}

function buildInfoTilesPayload(section: NormalizedHomeSection, dataCtx: BuildHomeDataContext): Record<string, unknown> {
  const configuredTiles = Array.isArray(section.payload.tiles)
    ? section.payload.tiles.filter((it): it is Record<string, unknown> => !!it && typeof it === 'object' && !Array.isArray(it))
    : [];

  const fallbackTiles: Array<Record<string, unknown>> = [];
  if (dataCtx.storeSettings?.deliveryEnabled) {
    fallbackTiles.push({
      id: 'delivery',
      title: 'Fast delivery',
      subtitle: 'Reliable doorstep delivery options',
      iconKey: 'delivery',
      ctaLabel: null,
      ctaTarget: null,
      sortOrder: fallbackTiles.length,
    });
  }
  if (dataCtx.storeSettings?.pickupEnabled) {
    fallbackTiles.push({
      id: 'pickup',
      title: 'Store pickup',
      subtitle: 'Pick your order from the nearest branch',
      iconKey: 'pickup',
      ctaLabel: null,
      ctaTarget: null,
      sortOrder: fallbackTiles.length,
    });
  }
  if (dataCtx.storeSettings?.supportWhatsApp || dataCtx.storeSettings?.supportEmail) {
    fallbackTiles.push({
      id: 'support',
      title: 'Support',
      subtitle: dataCtx.storeSettings.supportWhatsApp ?? dataCtx.storeSettings.supportEmail,
      iconKey: 'support',
      ctaLabel: 'Contact us',
      ctaTarget: dataCtx.storeSettings.supportWhatsApp
        ? `https://wa.me/${dataCtx.storeSettings.supportWhatsApp.replace(/\D/g, '')}`
        : null,
      sortOrder: fallbackTiles.length,
    });
  }

  const tiles = (configuredTiles.length ? configuredTiles : fallbackTiles)
    .map((tile, index) => ({
      id: typeof tile.id === 'string' ? tile.id : `tile-${index}`,
      title: typeof tile.title === 'string' ? tile.title : null,
      subtitle: typeof tile.subtitle === 'string'
        ? tile.subtitle
        : typeof tile.description === 'string'
          ? tile.description
          : null,
      iconKey: typeof tile.iconKey === 'string' ? tile.iconKey : null,
      image: asObject(tile.image),
      ctaLabel: typeof tile.ctaLabel === 'string' ? tile.ctaLabel : null,
      ctaTarget: typeof tile.ctaTarget === 'string' ? tile.ctaTarget : null,
      sortOrder: asNumber(tile.sortOrder, index),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    ...section.payload,
    styleVariant: section.payload.styleVariant ?? section.componentKey,
    tiles,
  };
}

function assembleSection(section: NormalizedHomeSection, dataCtx: BuildHomeDataContext): HomeLayoutSection {
  let payload: Record<string, unknown> = section.payload;

  if (section.type === 'heroCarousel') payload = buildHeroPayload(section, dataCtx);
  if (section.type === 'categoryGrid') payload = buildCategoryPayload(section, dataCtx);
  if (section.type === 'productRail') payload = buildProductRailPayload(section, dataCtx);
  if (section.type === 'promoStrip') payload = buildPromoStripPayload(section);
  if (section.type === 'infoTiles') payload = buildInfoTilesPayload(section, dataCtx);

  return {
    id: section.id,
    type: section.type,
    componentKey: section.componentKey,
    enabled: section.enabled,
    sortOrder: section.sortOrder,
    title: section.title,
    subtitle: section.subtitle,
    analyticsKey: section.analyticsKey,
    payload,
    visibility: section.visibility && Object.keys(section.visibility).length ? section.visibility : null,
  };
}

function buildFallbackSections(storeId: string): HomeSection[] {
  return HOME_SECTION_TYPES.map((type, index) => {
    const row = new HomeSection();
    row.id = `${storeId}-fallback-${type}`;
    row.storeId = storeId;
    row.type = type;
    row.sortOrder = index;
    row.enabled = true;
    row.config = {
      componentKey: DEFAULT_COMPONENT_BY_TYPE[type],
      title: null,
      subtitle: null,
      analyticsKey: `${type}.default`,
      payload: {},
    };
    return row;
  });
}

async function buildAuthoringSections(ctx: ActionContext, storeId: string, mode: HomeLayoutMode): Promise<NormalizedHomeSection[]> {
  const rows = await ctx.db.getRepository(HomeSection).find({
    where: { storeId, enabled: true },
    order: { sortOrder: 'ASC' as any },
  });

  return rows
    .map((row: HomeSection) => normalizeStorageSection(row))
    .filter((row: NormalizedHomeSection | null): row is NormalizedHomeSection => !!row)
    .filter((row: NormalizedHomeSection) => !row.modes || row.modes.includes(mode));
}

function buildConfigFallbackSections(storeId: string): NormalizedHomeSection[] {
  return buildFallbackSections(storeId)
    .map((row: HomeSection) => normalizeStorageSection(row))
    .filter((row: NormalizedHomeSection | null): row is NormalizedHomeSection => !!row);
}

function finalizeSections(sections: NormalizedHomeSection[], dataCtx: BuildHomeDataContext): HomeLayoutSection[] {
  return sections
    .filter((row: NormalizedHomeSection) => row.enabled)
    .sort((a: NormalizedHomeSection, b: NormalizedHomeSection) => a.sortOrder - b.sortOrder)
    .map((row: NormalizedHomeSection) => assembleSection(row, dataCtx))
    .filter((section: HomeLayoutSection) => isValidHomeSectionType(section.type) && isValidHomeComponentKey(section.componentKey));
}

export async function publishHomeLayoutForStore(ctx: ActionContext, storeId: string, mode: HomeLayoutMode = 'live'): Promise<HomeLayoutResponse> {
  const dataCtx = await loadHomeDataContext(ctx, storeId);
  const authoringSections = await buildAuthoringSections(ctx, storeId, mode);
  const candidateSections = authoringSections.length ? authoringSections : buildConfigFallbackSections(storeId);
  const sections = finalizeSections(candidateSections, dataCtx);
  const runtimeLayout: HomeLayoutResponse = {
    mode,
    storeId,
    sections,
  };

  await runtimeLayoutRef(storeId, mode).set(runtimeLayout);
  return runtimeLayout;
}

async function readPublishedHomeLayout(storeId: string, mode: HomeLayoutMode): Promise<HomeLayoutResponse | null> {
  const snapshot = await runtimeLayoutRef(storeId, mode).get();
  if (!snapshot.exists()) return null;

  const raw = asObject(snapshot.val());
  const sections = Array.isArray(raw.sections)
    ? raw.sections
      .map((row) => normalizeRuntimeSection(row))
      .filter((row: NormalizedHomeSection | null): row is NormalizedHomeSection => !!row && row.enabled)
      .sort((a: NormalizedHomeSection, b: NormalizedHomeSection) => a.sortOrder - b.sortOrder)
      .map((row: NormalizedHomeSection) => ({
        id: row.id,
        type: row.type,
        componentKey: row.componentKey,
        enabled: row.enabled,
        sortOrder: row.sortOrder,
        title: row.title,
        subtitle: row.subtitle,
        analyticsKey: row.analyticsKey,
        payload: row.payload,
        visibility: row.visibility && Object.keys(row.visibility).length ? row.visibility : null,
      }))
    : [];

  if (!sections.length) return null;

  return {
    mode,
    storeId,
    sections,
  };
}

export async function buildHomeLayout(ctx: ActionContext, payload: any = {}): Promise<HomeLayoutResponse> {
  if (!ctx.storeId) {
    throw new AppError('VALIDATION_FAILED', 'storeId is required for home layout');
  }

  const mode = normalizeMode(payload?.mode);
  const published = await readPublishedHomeLayout(ctx.storeId, mode);
  if (published) return published;

  ctx.logger.warn('homeGetLayout fallback to config preset: RTDB layout missing or invalid', {
    storeId: ctx.storeId,
    mode,
  });

  const dataCtx = await loadHomeDataContext(ctx, ctx.storeId);
  const sections = finalizeSections(buildConfigFallbackSections(ctx.storeId), dataCtx);

  return {
    mode,
    storeId: ctx.storeId,
    sections,
  };
}
