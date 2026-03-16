import { MigrationInterface, QueryRunner } from 'typeorm';

export class POSCashierFoundation1729300000000 implements MigrationInterface {
  name = 'POSCashierFoundation1729300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE pos_sessions (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      branchId char(36) NULL,
      deviceId char(36) NULL,
      employeeId char(36) NULL,
      drawerSessionId char(36) NULL,
      status varchar(24) NOT NULL DEFAULT 'open',
      openingFloatCents bigint NOT NULL DEFAULT 0,
      expectedCashCents bigint NOT NULL DEFAULT 0,
      actualCashCents bigint NULL,
      varianceCents bigint NULL,
      note varchar(255) NULL,
      openedByUid varchar(64) NULL,
      closedByUid varchar(64) NULL,
      closedAt datetime NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_pos_sessions_drawer_session FOREIGN KEY (drawerSessionId) REFERENCES drawer_sessions(id) ON DELETE SET NULL,
      CONSTRAINT chk_pos_sessions_status CHECK (status IN ('open','closed'))
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE INDEX idx_pos_sessions_store_status ON pos_sessions (storeId, status)');

    await queryRunner.query(`CREATE TABLE pos_sales (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      branchId char(36) NULL,
      deviceId char(36) NULL,
      employeeId char(36) NULL,
      posSessionId char(36) NULL,
      drawerSessionId char(36) NULL,
      customerUid varchar(128) NULL,
      status varchar(24) NOT NULL DEFAULT 'draft',
      subtotalCents bigint NOT NULL DEFAULT 0,
      discountCents bigint NOT NULL DEFAULT 0,
      taxCents bigint NOT NULL DEFAULT 0,
      totalCents bigint NOT NULL DEFAULT 0,
      note varchar(255) NULL,
      externalRef varchar(64) NULL,
      createdByUid varchar(64) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_pos_sales_session FOREIGN KEY (posSessionId) REFERENCES pos_sessions(id) ON DELETE SET NULL,
      CONSTRAINT fk_pos_sales_drawer_session FOREIGN KEY (drawerSessionId) REFERENCES drawer_sessions(id) ON DELETE SET NULL,
      CONSTRAINT chk_pos_sales_status CHECK (status IN ('draft','completed','cancelled','returned'))
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE INDEX idx_pos_sales_store_created ON pos_sales (storeId, createdAt)');
    await queryRunner.query('CREATE INDEX idx_pos_sales_session ON pos_sales (posSessionId)');

    await queryRunner.query(`CREATE TABLE pos_sale_items (
      id char(36) NOT NULL,
      posSaleId char(36) NOT NULL,
      productId char(36) NOT NULL,
      variantId char(36) NOT NULL,
      nameSnapshot varchar(180) NOT NULL,
      unitPriceCents bigint NOT NULL,
      qty decimal(12,3) NOT NULL,
      lineTotalCents bigint NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_pos_sale_items_sale FOREIGN KEY (posSaleId) REFERENCES pos_sales(id) ON DELETE CASCADE,
      CONSTRAINT fk_pos_sale_items_variant FOREIGN KEY (variantId) REFERENCES product_variants(id),
      CONSTRAINT chk_pos_sale_items_qty CHECK (qty > 0)
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE INDEX idx_pos_sale_items_sale ON pos_sale_items (posSaleId)');

    await queryRunner.query(`CREATE TABLE pos_sale_payments (
      id char(36) NOT NULL,
      posSaleId char(36) NOT NULL,
      tenderType varchar(24) NOT NULL,
      amountCents bigint NOT NULL,
      referenceNo varchar(64) NULL,
      status varchar(24) NOT NULL DEFAULT 'captured',
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_pos_sale_payments_sale FOREIGN KEY (posSaleId) REFERENCES pos_sales(id) ON DELETE CASCADE,
      CONSTRAINT chk_pos_sale_payments_amount CHECK (amountCents > 0)
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE pos_returns (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      posSaleId char(36) NOT NULL,
      posSessionId char(36) NULL,
      drawerSessionId char(36) NULL,
      employeeId char(36) NULL,
      status varchar(24) NOT NULL DEFAULT 'completed',
      totalRefundCents bigint NOT NULL DEFAULT 0,
      note varchar(255) NULL,
      createdByUid varchar(64) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_pos_returns_sale FOREIGN KEY (posSaleId) REFERENCES pos_sales(id),
      CONSTRAINT fk_pos_returns_session FOREIGN KEY (posSessionId) REFERENCES pos_sessions(id) ON DELETE SET NULL,
      CONSTRAINT fk_pos_returns_drawer_session FOREIGN KEY (drawerSessionId) REFERENCES drawer_sessions(id) ON DELETE SET NULL,
      CONSTRAINT chk_pos_returns_status CHECK (status IN ('draft','completed','cancelled'))
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE pos_return_items (
      id char(36) NOT NULL,
      posReturnId char(36) NOT NULL,
      posSaleItemId char(36) NOT NULL,
      variantId char(36) NOT NULL,
      qty decimal(12,3) NOT NULL,
      unitPriceCents bigint NOT NULL,
      lineRefundCents bigint NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_pos_return_items_return FOREIGN KEY (posReturnId) REFERENCES pos_returns(id) ON DELETE CASCADE,
      CONSTRAINT fk_pos_return_items_sale_item FOREIGN KEY (posSaleItemId) REFERENCES pos_sale_items(id),
      CONSTRAINT fk_pos_return_items_variant FOREIGN KEY (variantId) REFERENCES product_variants(id),
      CONSTRAINT chk_pos_return_items_qty CHECK (qty > 0)
    ) ENGINE=InnoDB`);

    await queryRunner.query('CREATE INDEX idx_pos_returns_store_created ON pos_returns (storeId, createdAt)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE pos_return_items');
    await queryRunner.query('DROP TABLE pos_returns');
    await queryRunner.query('DROP TABLE pos_sale_payments');
    await queryRunner.query('DROP TABLE pos_sale_items');
    await queryRunner.query('DROP TABLE pos_sales');
    await queryRunner.query('DROP TABLE pos_sessions');
  }
}
