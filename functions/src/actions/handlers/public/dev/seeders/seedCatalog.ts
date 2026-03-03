import { Category } from '../../../../../entities/Category';
import { Product } from '../../../../../entities/Product';
import { ProductVariant } from '../../../../../entities/ProductVariant';
import { ProductSpec } from '../../../../../entities/ProductSpec';
import { ProductImage } from '../../../../../entities/ProductImage';
import { InventoryAdjustment } from '../../../../../entities/InventoryAdjustment';
import { FeaturedItem } from '../../../../../entities/FeaturedItem';
import { UserProductFavorite } from '../../../../../entities/UserProductFavorite';
import { UserStoreFavorite } from '../../../../../entities/UserStoreFavorite';
import { Cart } from '../../../../../entities/Cart';
import { CartItem } from '../../../../../entities/CartItem';
import { MediaAsset } from '../../../../../entities/MediaAsset';
import { deterministicId, strNum, upsertById } from '../seederUtils';
import { SeedContext, SeedSummary } from '../types';

export async function seedCatalog(ctx: SeedContext, summary: SeedSummary) {
  const { manager, storeId, sizes, demoUids } = ctx;
  const categoryCount = Math.max(1, sizes.categories);
  const productCount = Math.max(1, sizes.products);
  const variantsPerProduct = Math.max(1, sizes.variantsPerProduct);

  for (let c = 0; c < categoryCount; c += 1) {
    await upsertById(manager, Category, 'Category', {
      id: deterministicId('category', c + 1),
      storeId,
      name: `Category ${c + 1}`,
      slug: `category-${c + 1}`,
      parentId: null,
      sortOrder: c,
      status: 'active',
    }, summary);
  }

  for (let p = 0; p < productCount; p += 1) {
    const productId = deterministicId('product', p + 1);
    const mediaId = deterministicId('media', p + 1);

    await upsertById(manager, Product, 'Product', {
      id: productId,
      storeId,
      categoryId: deterministicId('category', (p % categoryCount) + 1),
      name: `Demo Product ${p + 1}`,
      slug: `demo-product-${p + 1}`,
      description: 'Seeded demo product',
      status: 'active',
    }, summary);

    await upsertById(manager, MediaAsset, 'MediaAsset', {
      id: mediaId,
      storeId,
      ownerType: 'product',
      ownerId: productId,
      kind: 'image',
      originalPath: `dev/${storeId}/products/${productId}/original.jpg`,
      thumbnailPath: `dev/${storeId}/products/${productId}/thumb.jpg`,
      contentType: 'image/jpeg',
      sizeBytes: strNum(120000),
      status: 'ready',
      createdByUid: demoUids.adminCatalogUid,
    }, summary);

    await upsertById(manager, ProductImage, 'ProductImage', {
      id: deterministicId('prodimg', p + 1),
      productId,
      mediaAssetId: mediaId,
      sortOrder: 0,
    }, summary);

    await upsertById(manager, ProductSpec, 'ProductSpec', {
      id: deterministicId('prodspec', p + 1),
      productId,
      specKey: 'Material',
      specValue: 'Demo Fiber',
      sortOrder: 0,
    }, summary);

    await upsertById(manager, FeaturedItem, 'FeaturedItem', {
      id: deterministicId('featured', p + 1),
      storeId,
      productId,
      sortOrder: p,
    }, summary);

    for (let v = 0; v < variantsPerProduct; v += 1) {
      const variantId = deterministicId(`variant${p + 1}`, v + 1);
      await upsertById(manager, ProductVariant, 'ProductVariant', {
        id: variantId,
        productId,
        sku: `SKU-${p + 1}-${v + 1}`,
        priceCents: strNum(1000 + p * 100 + v * 20),
        stockQty: 50,
        attributes: { size: ['S', 'M', 'L'][v % 3], color: ['Black', 'White'][v % 2] },
        status: 'active',
      }, summary);

      await upsertById(manager, InventoryAdjustment, 'InventoryAdjustment', {
        id: deterministicId(`invadj${p + 1}`, v + 1),
        variantId,
        deltaQty: 50,
        reason: 'initial seed',
        performedByUid: demoUids.adminCatalogUid,
      }, summary);
    }
  }

  await upsertById(manager, UserProductFavorite, 'UserProductFavorite', {
    id: deterministicId('pfav', 1),
    uid: demoUids.clientUid,
    productId: deterministicId('product', 1),
  }, summary);
  await upsertById(manager, UserStoreFavorite, 'UserStoreFavorite', {
    id: deterministicId('sfav', 1),
    uid: demoUids.clientUid,
    storeId,
  }, summary);

  await upsertById(manager, Cart, 'Cart', {
    id: deterministicId('cart', 1),
    uid: demoUids.clientUid,
    storeId,
    couponCode: null,
  }, summary);
  await upsertById(manager, CartItem, 'CartItem', {
    id: deterministicId('cartitem', 1),
    cartId: deterministicId('cart', 1),
    productId: deterministicId('product', 1),
    variantId: deterministicId('variant1', 1),
    qty: 1,
    unitPriceCents: strNum(1200),
  }, summary);
}
