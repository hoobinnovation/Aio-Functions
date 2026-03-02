import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCatalogBrowse1750000000000 implements MigrationInterface {
  name = 'InitCatalogBrowse1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE stores (
        id char(36) NOT NULL,
        name varchar(191) NOT NULL,
        city varchar(120) NOT NULL,
        area varchar(120) NOT NULL,
        addressShort varchar(255) NOT NULL,
        phone varchar(32) NULL,
        logoUrl varchar(500) NULL,
        openingHours json NULL,
        isOpen tinyint NOT NULL DEFAULT 1,
        isDisabled tinyint NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;

      CREATE TABLE admin_users (
        uid varchar(128) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'active',
        PRIMARY KEY (uid)
      ) ENGINE=InnoDB;

      CREATE TABLE admin_roles (
        id char(36) NOT NULL,
        adminUid varchar(128) NOT NULL,
        role varchar(64) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_admin_roles_adminUid (adminUid),
        INDEX IDX_admin_roles_role (role),
        PRIMARY KEY (id),
        CONSTRAINT FK_admin_roles_admin FOREIGN KEY (adminUid) REFERENCES admin_users(uid)
      ) ENGINE=InnoDB;

      CREATE TABLE categories (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        name varchar(191) NOT NULL,
        imageUrl varchar(500) NULL,
        sortOrder int NOT NULL DEFAULT 0,
        isDisabled tinyint NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_categories_storeId (storeId),
        INDEX IDX_categories_store_sort (storeId, sortOrder),
        PRIMARY KEY (id),
        CONSTRAINT FK_categories_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE products (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        categoryId char(36) NULL,
        name varchar(191) NOT NULL,
        thumbnailUrl varchar(500) NOT NULL,
        price decimal(10,2) NOT NULL,
        compareAtPrice decimal(10,2) NULL,
        currency varchar(8) NOT NULL DEFAULT 'EGP',
        ratingAvg decimal(3,2) NULL,
        ratingCount int NOT NULL DEFAULT 0,
        isFeatured tinyint NOT NULL DEFAULT 0,
        isDisabled tinyint NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_products_storeId (storeId),
        INDEX IDX_products_store_name (storeId, name),
        INDEX IDX_products_store_created (storeId, createdAt),
        INDEX IDX_products_store_featured (storeId, isFeatured),
        PRIMARY KEY (id),
        CONSTRAINT FK_products_store FOREIGN KEY (storeId) REFERENCES stores(id),
        CONSTRAINT FK_products_category FOREIGN KEY (categoryId) REFERENCES categories(id)
      ) ENGINE=InnoDB;

      CREATE TABLE product_variants (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        productId char(36) NOT NULL,
        name varchar(120) NOT NULL,
        sku varchar(120) NULL,
        priceOverride decimal(10,2) NULL,
        stockQty int NOT NULL DEFAULT 0,
        isActive tinyint NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_product_variants_store_product (storeId, productId),
        PRIMARY KEY (id),
        CONSTRAINT FK_product_variants_store FOREIGN KEY (storeId) REFERENCES stores(id),
        CONSTRAINT FK_product_variants_product FOREIGN KEY (productId) REFERENCES products(id)
      ) ENGINE=InnoDB;

      CREATE TABLE product_attributes (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        productId char(36) NOT NULL,
        attrKey varchar(64) NOT NULL,
        attrValue varchar(128) NOT NULL,
        INDEX IDX_product_attributes_store (storeId),
        INDEX IDX_product_attributes_store_key_value (storeId, attrKey, attrValue),
        INDEX IDX_product_attributes_product (productId),
        PRIMARY KEY (id),
        CONSTRAINT FK_product_attributes_store FOREIGN KEY (storeId) REFERENCES stores(id),
        CONSTRAINT FK_product_attributes_product FOREIGN KEY (productId) REFERENCES products(id)
      ) ENGINE=InnoDB;

      CREATE TABLE banners (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        imageUrl varchar(500) NOT NULL,
        title varchar(191) NULL,
        actionType enum('none','open_category','open_product','open_url') NOT NULL DEFAULT 'none',
        actionValue varchar(255) NULL,
        sortOrder int NOT NULL DEFAULT 0,
        isDisabled tinyint NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_banners_storeId (storeId),
        INDEX IDX_banners_store_sort (storeId, sortOrder),
        PRIMARY KEY (id),
        CONSTRAINT FK_banners_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE user_favorites (
        id char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        storeId char(36) NOT NULL,
        productId char(36) NOT NULL,
        variantId char(36) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_user_favorites_uid_product_variant (uid, productId, variantId),
        INDEX IDX_user_favorites_uid_store (uid, storeId),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;

      CREATE TABLE carts (
        id char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        storeId char(36) NOT NULL,
        isActive tinyint NOT NULL DEFAULT 1,
        couponCode varchar(50) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_carts_uid_store (uid, storeId),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;

      CREATE TABLE cart_items (
        id char(36) NOT NULL,
        cartId char(36) NOT NULL,
        storeId char(36) NOT NULL,
        productId char(36) NOT NULL,
        variantId char(36) NOT NULL,
        qty int NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_cart_items_cart_variant (cartId, variantId),
        INDEX IDX_cart_items_cart (cartId),
        PRIMARY KEY (id),
        CONSTRAINT FK_cart_items_cart FOREIGN KEY (cartId) REFERENCES carts(id),
        CONSTRAINT FK_cart_items_variant FOREIGN KEY (variantId) REFERENCES product_variants(id)
      ) ENGINE=InnoDB;

      CREATE TABLE coupons (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        code varchar(50) NOT NULL,
        discountType enum('percent','fixed') NOT NULL,
        discountValue decimal(10,2) NOT NULL,
        minOrderTotal decimal(10,2) NULL,
        usageLimit int NOT NULL DEFAULT 0,
        usageCount int NOT NULL DEFAULT 0,
        isActive tinyint NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_coupons_store_code (storeId, code),
        PRIMARY KEY (id),
        CONSTRAINT FK_coupons_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE shipping_methods (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        name varchar(120) NOT NULL,
        type enum('flat','by_area','pickup') NOT NULL,
        cost decimal(10,2) NOT NULL DEFAULT 0,
        rules json NULL,
        estimatedDays int NULL,
        isActive tinyint NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_shipping_methods_store (storeId),
        PRIMARY KEY (id),
        CONSTRAINT FK_shipping_methods_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE user_addresses (
        id char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        storeId char(36) NOT NULL,
        line1 varchar(191) NOT NULL,
        line2 varchar(191) NULL,
        city varchar(120) NOT NULL,
        area varchar(120) NOT NULL,
        postalCode varchar(30) NOT NULL,
        countryCode varchar(2) NOT NULL,
        phone varchar(32) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_user_addresses_uid_store (uid, storeId),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;

      CREATE TABLE orders (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        orderNumber varchar(50) NOT NULL,
        status enum('pending','processing','shipped','delivered','cancelled') NOT NULL,
        paymentStatus enum('unpaid','pending','paid','failed','refunded') NOT NULL,
        subtotal decimal(10,2) NOT NULL,
        discountTotal decimal(10,2) NOT NULL DEFAULT 0,
        shippingTotal decimal(10,2) NOT NULL DEFAULT 0,
        taxTotal decimal(10,2) NOT NULL DEFAULT 0,
        total decimal(10,2) NOT NULL,
        currency varchar(8) NOT NULL,
        addressSnapshot json NOT NULL,
        shippingSnapshot json NOT NULL,
        couponSnapshot json NULL,
        paymentMethodCode varchar(50) NOT NULL,
        paymentProvider varchar(50) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_orders_store (storeId),
        INDEX IDX_orders_uid (uid),
        UNIQUE KEY IDX_orders_store_number (storeId, orderNumber),
        PRIMARY KEY (id),
        CONSTRAINT FK_orders_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE order_items (
        id char(36) NOT NULL,
        orderId char(36) NOT NULL,
        storeId char(36) NOT NULL,
        productId char(36) NOT NULL,
        variantId char(36) NOT NULL,
        nameSnapshot varchar(191) NOT NULL,
        thumbnailUrlSnapshot varchar(500) NOT NULL,
        variantSummarySnapshot varchar(191) NOT NULL,
        unitPrice decimal(10,2) NOT NULL,
        qty int NOT NULL,
        lineTotal decimal(10,2) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_order_items_order (orderId),
        INDEX IDX_order_items_store (storeId),
        PRIMARY KEY (id),
        CONSTRAINT FK_order_items_order FOREIGN KEY (orderId) REFERENCES orders(id)
      ) ENGINE=InnoDB;

      CREATE TABLE order_status_history (
        id char(36) NOT NULL,
        orderId char(36) NOT NULL,
        fromStatus varchar(30) NULL,
        toStatus varchar(30) NOT NULL,
        note varchar(255) NULL,
        actorType enum('user','admin','system') NOT NULL,
        actorUid varchar(128) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_order_status_history_order (orderId),
        PRIMARY KEY (id),
        CONSTRAINT FK_order_status_history_order FOREIGN KEY (orderId) REFERENCES orders(id)
      ) ENGINE=InnoDB;

      CREATE TABLE shipments (
        id char(36) NOT NULL,
        orderId char(36) NOT NULL,
        storeId char(36) NOT NULL,
        carrier varchar(100) NULL,
        trackingNumber varchar(100) NULL,
        status enum('created','in_transit','delivered') NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_shipments_order (orderId),
        PRIMARY KEY (id),
        CONSTRAINT FK_shipments_order FOREIGN KEY (orderId) REFERENCES orders(id)
      ) ENGINE=InnoDB;

      CREATE TABLE payment_sessions (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        orderId char(36) NULL,
        provider varchar(50) NOT NULL,
        status enum('created','pending','success','failed','cancelled') NOT NULL,
        amount decimal(10,2) NOT NULL,
        currency varchar(8) NOT NULL,
        paymentUrl text NOT NULL,
        providerPayload json NULL,
        expiresAt datetime NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_payment_sessions_store (storeId),
        INDEX IDX_payment_sessions_uid (uid),
        PRIMARY KEY (id),
        CONSTRAINT FK_payment_sessions_order FOREIGN KEY (orderId) REFERENCES orders(id)
      ) ENGINE=InnoDB;

      CREATE TABLE payment_events (
        id char(36) NOT NULL,
        sessionId char(36) NOT NULL,
        type varchar(100) NOT NULL,
        payload json NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_payment_events_session (sessionId),
        PRIMARY KEY (id),
        CONSTRAINT FK_payment_events_session FOREIGN KEY (sessionId) REFERENCES payment_sessions(id)
      ) ENGINE=InnoDB;

      CREATE TABLE payment_settings (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        provider varchar(50) NOT NULL,
        isActive tinyint NOT NULL DEFAULT 1,
        config json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_payment_settings_store_provider (storeId, provider),
        INDEX IDX_payment_settings_store (storeId),
        PRIMARY KEY (id),
        CONSTRAINT FK_payment_settings_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE coupon_redemptions (
        id char(36) NOT NULL,
        couponId char(36) NOT NULL,
        orderId char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        storeId char(36) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_coupon_redemptions_coupon_uid (couponId, uid),
        PRIMARY KEY (id),
        CONSTRAINT FK_coupon_redemptions_coupon FOREIGN KEY (couponId) REFERENCES coupons(id),
        CONSTRAINT FK_coupon_redemptions_order FOREIGN KEY (orderId) REFERENCES orders(id)
      ) ENGINE=InnoDB;

      CREATE TABLE admin_store_access (
        id char(36) NOT NULL,
        adminUid varchar(128) NOT NULL,
        storeId char(36) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_admin_store_access_admin_store (adminUid, storeId),
        INDEX IDX_admin_store_access_adminUid (adminUid),
        INDEX IDX_admin_store_access_storeId (storeId),
        PRIMARY KEY (id),
        CONSTRAINT FK_admin_store_access_admin FOREIGN KEY (adminUid) REFERENCES admin_users(uid),
        CONSTRAINT FK_admin_store_access_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE audit_logs (
        id char(36) NOT NULL,
        actorType varchar(30) NOT NULL,
        actorUid varchar(128) NULL,
        action varchar(100) NOT NULL,
        targetType varchar(50) NOT NULL,
        targetId varchar(128) NOT NULL,
        storeId char(36) NULL,
        metadata json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_audit_logs_actorUid (actorUid),
        INDEX IDX_audit_logs_storeId (storeId),
        INDEX IDX_audit_logs_action (action),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS admin_store_access;
      DROP TABLE IF EXISTS coupon_redemptions;
      DROP TABLE IF EXISTS payment_settings;
      DROP TABLE IF EXISTS payment_events;
      DROP TABLE IF EXISTS payment_sessions;
      DROP TABLE IF EXISTS shipments;
      DROP TABLE IF EXISTS order_status_history;
      DROP TABLE IF EXISTS order_items;
      DROP TABLE IF EXISTS orders;
      DROP TABLE IF EXISTS user_addresses;
      DROP TABLE IF EXISTS shipping_methods;
      DROP TABLE IF EXISTS coupons;
      DROP TABLE IF EXISTS cart_items;
      DROP TABLE IF EXISTS carts;
      DROP TABLE IF EXISTS user_favorites;
      DROP TABLE IF EXISTS banners;
      DROP TABLE IF EXISTS product_attributes;
      DROP TABLE IF EXISTS product_variants;
      DROP TABLE IF EXISTS products;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS admin_roles;
      DROP TABLE IF EXISTS admin_users;
      DROP TABLE IF EXISTS stores;
    `);
  }
}
