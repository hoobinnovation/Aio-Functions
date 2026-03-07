import { Banner } from '../../../../../entities/Banner';
import { HomeSection } from '../../../../../entities/HomeSection';
import { SeoSetting } from '../../../../../entities/SeoSetting';
import { LandingPage } from '../../../../../entities/LandingPage';
import { SitemapRun } from '../../../../../entities/SitemapRun';
import { deterministicId, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';

export async function seedHomeCMS(ctx: SeedContext, summary: SeedSummary) {
  const { manager, storeId } = ctx;
  await upsertById(manager, Banner, 'Banner', {
    id: deterministicId('banner', 1),
    storeId,
    title: 'Demo Banner',
    mediaAssetId: deterministicId('media', 1),
    linkUrl: '/promo/demo',
    sortOrder: 0,
    status: 'active',
  }, summary);

  await upsertById(manager, HomeSection, 'HomeSection', {
    id: deterministicId('home', 1),
    storeId,
    type: 'featured',
    config: { style: 'carousel', title: 'Featured Picks' },
    sortOrder: 0,
    enabled: true,
  }, summary);

  await upsertById(manager, SeoSetting, 'SeoSetting', {
    id: deterministicId('seo', 1),
    storeId,
    pageType: 'home',
    pageKey: 'index',
    title: 'Demo Store Home',
    description: 'Seeded SEO meta.',
    extra: { ogType: 'website' },
  }, summary);

  await upsertById(manager, LandingPage, 'LandingPage', {
    id: deterministicId('landing', 1),
    storeId,
    slug: 'welcome',
    title: 'Welcome to Demo Store',
    body: { blocks: [{ type: 'text', value: 'Seeded landing page content.' }] },
    status: 'published',
  }, summary);

  await upsertById(manager, SitemapRun, 'SitemapRun', {
    id: deterministicId('sitemap', 1),
    storeId,
    status: 'done',
    urlsCount: 24,
  }, summary);
}
