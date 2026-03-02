import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInsuranceAccountingAttribution1780000000000 implements MigrationInterface {
  name = 'AddInsuranceAccountingAttribution1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`

      ALTER TABLE user_addresses ADD COLUMN governorate varchar(120) NULL;
      ALTER TABLE user_addresses ADD COLUMN lat decimal(9,6) NULL;
      ALTER TABLE user_addresses ADD COLUMN lng decimal(9,6) NULL;

      CREATE TABLE delivery_zones (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        governorate varchar(100) NOT NULL,
        name varchar(120) NOT NULL,
        centerLat decimal(9,6) NOT NULL,
        centerLng decimal(9,6) NOT NULL,
        radiusKm decimal(8,3) NULL,
        fee decimal(10,2) NOT NULL,
        isActive tinyint NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_delivery_zones_store_governorate (storeId, governorate),
        PRIMARY KEY (id),
        CONSTRAINT FK_delivery_zones_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE insurance_orders (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        uid varchar(128) NOT NULL,
        status enum('insurance_submitted','insurance_under_review','insurance_quote_ready','insurance_customer_approved','insurance_customer_rejected','processing','shipped','delivered','cancelled') NOT NULL,
        notes text NULL,
        cardFilePath varchar(500) NULL,
        medicalFilePath varchar(500) NULL,
        addressSnapshot json NULL,
        deliveryZoneId char(36) NULL,
        deliveryFee decimal(10,2) NOT NULL DEFAULT 0,
        subtotal decimal(10,2) NOT NULL DEFAULT 0,
        total decimal(10,2) NOT NULL DEFAULT 0,
        quoteLocked tinyint NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_insurance_orders_store (storeId),
        INDEX IDX_insurance_orders_uid (uid),
        PRIMARY KEY (id),
        CONSTRAINT FK_insurance_orders_store FOREIGN KEY (storeId) REFERENCES stores(id),
        CONSTRAINT FK_insurance_orders_delivery_zone FOREIGN KEY (deliveryZoneId) REFERENCES delivery_zones(id)
      ) ENGINE=InnoDB;

      CREATE TABLE insurance_order_items (
        id char(36) NOT NULL,
        insuranceOrderId char(36) NOT NULL,
        storeId char(36) NOT NULL,
        productId char(36) NOT NULL,
        nameSnapshot varchar(191) NOT NULL,
        qty int NOT NULL,
        unitPriceCustomer decimal(10,2) NOT NULL,
        lineTotal decimal(10,2) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_insurance_order_items_order (insuranceOrderId),
        PRIMARY KEY (id),
        CONSTRAINT FK_insurance_order_items_order FOREIGN KEY (insuranceOrderId) REFERENCES insurance_orders(id),
        CONSTRAINT FK_insurance_order_items_store FOREIGN KEY (storeId) REFERENCES stores(id),
        CONSTRAINT FK_insurance_order_items_product FOREIGN KEY (productId) REFERENCES products(id)
      ) ENGINE=InnoDB;

      CREATE TABLE insurance_quote_events (
        id char(36) NOT NULL,
        insuranceOrderId char(36) NOT NULL,
        actorType enum('user','admin','system') NOT NULL,
        actorUid varchar(128) NULL,
        action varchar(120) NOT NULL,
        payload json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_insurance_quote_events_order (insuranceOrderId),
        PRIMARY KEY (id),
        CONSTRAINT FK_insurance_quote_events_order FOREIGN KEY (insuranceOrderId) REFERENCES insurance_orders(id)
      ) ENGINE=InnoDB;

      CREATE TABLE branches (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        name varchar(191) NOT NULL,
        address varchar(255) NULL,
        isActive tinyint NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_branches_store (storeId),
        PRIMARY KEY (id),
        CONSTRAINT FK_branches_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE devices (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        branchId char(36) NOT NULL,
        name varchar(120) NOT NULL,
        deviceCode varchar(64) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_devices_device_code (deviceCode),
        PRIMARY KEY (id),
        CONSTRAINT FK_devices_store FOREIGN KEY (storeId) REFERENCES stores(id),
        CONSTRAINT FK_devices_branch FOREIGN KEY (branchId) REFERENCES branches(id)
      ) ENGINE=InnoDB;

      CREATE TABLE employees (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        name varchar(191) NOT NULL,
        firebaseUid varchar(128) NULL,
        isActive tinyint NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_employees_store (storeId),
        PRIMARY KEY (id),
        CONSTRAINT FK_employees_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE cash_drawers (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        branchId char(36) NOT NULL,
        name varchar(120) NOT NULL,
        isActive tinyint NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_cash_drawers_store (storeId),
        PRIMARY KEY (id),
        CONSTRAINT FK_cash_drawers_store FOREIGN KEY (storeId) REFERENCES stores(id),
        CONSTRAINT FK_cash_drawers_branch FOREIGN KEY (branchId) REFERENCES branches(id)
      ) ENGINE=InnoDB;

      CREATE TABLE cash_drawer_sessions (
        id char(36) NOT NULL,
        drawerId char(36) NOT NULL,
        openedByEmployeeId char(36) NOT NULL,
        openedAt datetime NOT NULL,
        openingCash decimal(12,2) NOT NULL,
        closedAt datetime NULL,
        closingCashCounted decimal(12,2) NULL,
        variance decimal(12,2) NULL,
        status enum('open','closed') NOT NULL DEFAULT 'open',
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_cash_drawer_sessions_drawer (drawerId),
        PRIMARY KEY (id),
        CONSTRAINT FK_drawer_sessions_drawer FOREIGN KEY (drawerId) REFERENCES cash_drawers(id),
        CONSTRAINT FK_drawer_sessions_employee FOREIGN KEY (openedByEmployeeId) REFERENCES employees(id)
      ) ENGINE=InnoDB;

      CREATE TABLE pos_orders (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        branchId char(36) NOT NULL,
        deviceId char(36) NOT NULL,
        employeeId char(36) NOT NULL,
        itemsSnapshot json NOT NULL,
        paymentMethod enum('cash','card','online','wallet') NOT NULL,
        cashSessionId char(36) NULL,
        subtotal decimal(12,2) NOT NULL,
        total decimal(12,2) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_pos_orders_store (storeId),
        PRIMARY KEY (id),
        CONSTRAINT FK_pos_orders_store FOREIGN KEY (storeId) REFERENCES stores(id),
        CONSTRAINT FK_pos_orders_branch FOREIGN KEY (branchId) REFERENCES branches(id),
        CONSTRAINT FK_pos_orders_device FOREIGN KEY (deviceId) REFERENCES devices(id),
        CONSTRAINT FK_pos_orders_employee FOREIGN KEY (employeeId) REFERENCES employees(id),
        CONSTRAINT FK_pos_orders_session FOREIGN KEY (cashSessionId) REFERENCES cash_drawer_sessions(id)
      ) ENGINE=InnoDB;

      CREATE TABLE accounting_entries (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        type enum('revenue','expense','adjustment') NOT NULL,
        amount decimal(12,2) NOT NULL,
        currency varchar(8) NOT NULL,
        sourceChannel enum('app','web','pos','branch') NOT NULL,
        paymentMethod enum('cash','card','online','wallet') NOT NULL,
        branchId char(36) NULL,
        deviceId char(36) NULL,
        employeeId char(36) NULL,
        drawerSessionId char(36) NULL,
        category varchar(120) NULL,
        refType varchar(60) NULL,
        refId varchar(64) NULL,
        note varchar(255) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_accounting_entries_store_created (storeId, createdAt),
        INDEX IDX_accounting_entries_branch (branchId),
        INDEX IDX_accounting_entries_employee (employeeId),
        INDEX IDX_accounting_entries_device (deviceId),
        INDEX IDX_accounting_entries_channel (sourceChannel),
        PRIMARY KEY (id),
        CONSTRAINT FK_accounting_entries_store FOREIGN KEY (storeId) REFERENCES stores(id),
        CONSTRAINT FK_accounting_entries_branch FOREIGN KEY (branchId) REFERENCES branches(id),
        CONSTRAINT FK_accounting_entries_device FOREIGN KEY (deviceId) REFERENCES devices(id),
        CONSTRAINT FK_accounting_entries_employee FOREIGN KEY (employeeId) REFERENCES employees(id),
        CONSTRAINT FK_accounting_entries_drawer_session FOREIGN KEY (drawerSessionId) REFERENCES cash_drawer_sessions(id)
      ) ENGINE=InnoDB;

      CREATE TABLE marketing_touchpoints (
        id char(36) NOT NULL,
        storeId char(36) NOT NULL,
        uid varchar(128) NULL,
        sessionId varchar(128) NOT NULL,
        deviceIdHash varchar(191) NULL,
        firstTouchJson json NULL,
        lastTouchJson json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY IDX_marketing_touchpoints_store_session (storeId, sessionId),
        PRIMARY KEY (id),
        CONSTRAINT FK_marketing_touchpoints_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;

      CREATE TABLE order_attribution (
        orderId char(36) NOT NULL,
        storeId char(36) NOT NULL,
        insuranceOrderId char(36) NULL,
        firstTouchJson json NULL,
        lastTouchJson json NULL,
        INDEX IDX_order_attribution_store (storeId),
        PRIMARY KEY (orderId),
        CONSTRAINT FK_order_attribution_store FOREIGN KEY (storeId) REFERENCES stores(id)
      ) ENGINE=InnoDB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`

      ALTER TABLE user_addresses ADD COLUMN governorate varchar(120) NULL;
      ALTER TABLE user_addresses ADD COLUMN lat decimal(9,6) NULL;
      ALTER TABLE user_addresses ADD COLUMN lng decimal(9,6) NULL;

      DROP TABLE IF EXISTS order_attribution;
      DROP TABLE IF EXISTS marketing_touchpoints;
      DROP TABLE IF EXISTS accounting_entries;
      DROP TABLE IF EXISTS pos_orders;
      DROP TABLE IF EXISTS cash_drawer_sessions;
      DROP TABLE IF EXISTS cash_drawers;
      DROP TABLE IF EXISTS employees;
      DROP TABLE IF EXISTS devices;
      DROP TABLE IF EXISTS branches;
      DROP TABLE IF EXISTS insurance_quote_events;
      DROP TABLE IF EXISTS insurance_order_items;
      DROP TABLE IF EXISTS insurance_orders;
      DROP TABLE IF EXISTS delivery_zones;
      ALTER TABLE user_addresses DROP COLUMN lng;
      ALTER TABLE user_addresses DROP COLUMN lat;
      ALTER TABLE user_addresses DROP COLUMN governorate;
    `);
  }
}
