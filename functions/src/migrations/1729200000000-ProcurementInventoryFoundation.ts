import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProcurementInventoryFoundation1729200000000 implements MigrationInterface {
  name = 'ProcurementInventoryFoundation1729200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE suppliers (
      id char(36) NOT NULL,
      storeId varchar(64) NULL,
      name varchar(120) NOT NULL,
      legalName varchar(120) NULL,
      code varchar(64) NULL,
      status varchar(16) NOT NULL DEFAULT 'active',
      notes varchar(255) NULL,
      metadata json NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      supplierScopeKey varchar(72) GENERATED ALWAYS AS (COALESCE(storeId,'__global__')) STORED,
      PRIMARY KEY (id),
      CONSTRAINT chk_supplier_status CHECK (status IN ('active','inactive'))
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE UNIQUE INDEX uq_suppliers_scope_code ON suppliers (supplierScopeKey, code)');
    await queryRunner.query('CREATE INDEX idx_suppliers_scope_status ON suppliers (storeId, status)');

    await queryRunner.query(`CREATE TABLE supplier_contacts (
      id char(36) NOT NULL,
      supplierId char(36) NOT NULL,
      fullName varchar(120) NOT NULL,
      role varchar(120) NULL,
      email varchar(120) NULL,
      phone varchar(40) NULL,
      isPrimary tinyint(1) NOT NULL DEFAULT 0,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_supplier_contacts_supplier FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE INDEX idx_supplier_contacts_supplier ON supplier_contacts (supplierId)');

    await queryRunner.query(`CREATE TABLE supplier_variants (
      id char(36) NOT NULL,
      supplierId char(36) NOT NULL,
      variantId char(36) NOT NULL,
      supplierSku varchar(120) NULL,
      lastCostCents decimal(14,4) NULL,
      currencyCode varchar(8) NOT NULL DEFAULT 'EGP',
      isPreferred tinyint(1) NOT NULL DEFAULT 0,
      leadTimeDays int NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      preferredMarker tinyint GENERATED ALWAYS AS (IF(isPreferred=1,1,NULL)) STORED,
      PRIMARY KEY (id),
      CONSTRAINT fk_supplier_variants_supplier FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE,
      CONSTRAINT fk_supplier_variants_variant FOREIGN KEY (variantId) REFERENCES product_variants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE UNIQUE INDEX uq_supplier_variants_supplier_variant ON supplier_variants (supplierId, variantId)');
    await queryRunner.query('CREATE UNIQUE INDEX uq_supplier_variants_preferred_per_variant ON supplier_variants (variantId, preferredMarker)');

    await queryRunner.query(`CREATE TABLE warehouses (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      name varchar(100) NOT NULL,
      code varchar(64) NULL,
      address varchar(255) NULL,
      isActive tinyint(1) NOT NULL DEFAULT 1,
      isDefault tinyint(1) NOT NULL DEFAULT 0,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      defaultMarker tinyint GENERATED ALWAYS AS (IF(isDefault=1,1,NULL)) STORED,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE UNIQUE INDEX uq_warehouses_store_code ON warehouses (storeId, code)');
    await queryRunner.query('CREATE UNIQUE INDEX uq_warehouses_default_per_store ON warehouses (storeId, defaultMarker)');

    await queryRunner.query(`CREATE TABLE warehouse_locations (
      id char(36) NOT NULL,
      warehouseId char(36) NOT NULL,
      code varchar(80) NOT NULL,
      name varchar(120) NULL,
      isActive tinyint(1) NOT NULL DEFAULT 1,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_warehouse_locations_warehouse FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE UNIQUE INDEX uq_warehouse_locations_code ON warehouse_locations (warehouseId, code)');

    await queryRunner.query(`CREATE TABLE purchase_orders (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      supplierId char(36) NOT NULL,
      warehouseId char(36) NULL,
      poNumber varchar(40) NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'draft',
      expectedDate date NULL,
      notes varchar(255) NULL,
      subtotalCents bigint NOT NULL DEFAULT 0,
      totalCents bigint NOT NULL DEFAULT 0,
      createdByUid varchar(64) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_purchase_orders_supplier FOREIGN KEY (supplierId) REFERENCES suppliers(id),
      CONSTRAINT fk_purchase_orders_warehouse FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE SET NULL,
      CONSTRAINT chk_purchase_orders_status CHECK (status IN ('draft','submitted','approved','partially_received','received','cancelled'))
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE UNIQUE INDEX uq_purchase_orders_store_number ON purchase_orders (storeId, poNumber)');

    await queryRunner.query(`CREATE TABLE purchase_order_items (
      id char(36) NOT NULL,
      purchaseOrderId char(36) NOT NULL,
      variantId char(36) NOT NULL,
      orderedQty decimal(12,3) NOT NULL,
      receivedQty decimal(12,3) NOT NULL DEFAULT 0,
      unitCostCents bigint NOT NULL,
      lineTotalCents bigint NOT NULL,
      note varchar(140) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_purchase_order_items_po FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_purchase_order_items_variant FOREIGN KEY (variantId) REFERENCES product_variants(id),
      CONSTRAINT chk_purchase_order_items_qty CHECK (orderedQty > 0 AND receivedQty >= 0 AND receivedQty <= orderedQty)
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE INDEX idx_purchase_order_items_po ON purchase_order_items (purchaseOrderId)');

    await queryRunner.query(`CREATE TABLE goods_receipts (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      purchaseOrderId char(36) NULL,
      supplierId char(36) NOT NULL,
      warehouseId char(36) NOT NULL,
      receiptNumber varchar(40) NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'posted',
      receivedDate date NOT NULL,
      note varchar(255) NULL,
      receivedByUid varchar(64) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_goods_receipts_po FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(id) ON DELETE SET NULL,
      CONSTRAINT fk_goods_receipts_supplier FOREIGN KEY (supplierId) REFERENCES suppliers(id),
      CONSTRAINT fk_goods_receipts_warehouse FOREIGN KEY (warehouseId) REFERENCES warehouses(id)
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE UNIQUE INDEX uq_goods_receipts_store_number ON goods_receipts (storeId, receiptNumber)');

    await queryRunner.query(`CREATE TABLE goods_receipt_items (
      id char(36) NOT NULL,
      goodsReceiptId char(36) NOT NULL,
      purchaseOrderItemId char(36) NULL,
      variantId char(36) NOT NULL,
      receivedQty decimal(12,3) NOT NULL,
      unitCostCents bigint NOT NULL,
      expiryDate date NULL,
      lotNumber varchar(80) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_goods_receipt_items_receipt FOREIGN KEY (goodsReceiptId) REFERENCES goods_receipts(id) ON DELETE CASCADE,
      CONSTRAINT fk_goods_receipt_items_po_item FOREIGN KEY (purchaseOrderItemId) REFERENCES purchase_order_items(id) ON DELETE SET NULL,
      CONSTRAINT fk_goods_receipt_items_variant FOREIGN KEY (variantId) REFERENCES product_variants(id),
      CONSTRAINT chk_goods_receipt_items_qty CHECK (receivedQty > 0)
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE inventory_lots (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      variantId char(36) NOT NULL,
      warehouseId char(36) NOT NULL,
      goodsReceiptItemId char(36) NULL,
      lotNumber varchar(80) NOT NULL,
      expiryDate date NULL,
      receivedQty decimal(12,3) NOT NULL DEFAULT 0,
      remainingQty decimal(12,3) NOT NULL DEFAULT 0,
      unitCostCents bigint NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_inventory_lots_variant FOREIGN KEY (variantId) REFERENCES product_variants(id),
      CONSTRAINT fk_inventory_lots_warehouse FOREIGN KEY (warehouseId) REFERENCES warehouses(id),
      CONSTRAINT fk_inventory_lots_gr_item FOREIGN KEY (goodsReceiptItemId) REFERENCES goods_receipt_items(id) ON DELETE SET NULL,
      CONSTRAINT chk_inventory_lots_qty CHECK (receivedQty >= 0 AND remainingQty >= 0 AND remainingQty <= receivedQty)
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE UNIQUE INDEX uq_inventory_lots_scope_lot ON inventory_lots (storeId, variantId, warehouseId, lotNumber)');

    await queryRunner.query(`CREATE TABLE stock_movements (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      variantId char(36) NOT NULL,
      warehouseId char(36) NULL,
      warehouseLocationId char(36) NULL,
      lotId char(36) NULL,
      movementType varchar(32) NOT NULL,
      qtyDelta decimal(12,3) NOT NULL,
      beforeQty decimal(12,3) NULL,
      afterQty decimal(12,3) NULL,
      unitCostCents bigint NULL,
      sourceDocumentType varchar(48) NOT NULL,
      sourceDocumentId varchar(80) NOT NULL,
      sourceEventType varchar(64) NULL,
      metadata json NULL,
      createdByUid varchar(64) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_stock_movements_variant FOREIGN KEY (variantId) REFERENCES product_variants(id),
      CONSTRAINT fk_stock_movements_warehouse FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE SET NULL,
      CONSTRAINT fk_stock_movements_location FOREIGN KEY (warehouseLocationId) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
      CONSTRAINT fk_stock_movements_lot FOREIGN KEY (lotId) REFERENCES inventory_lots(id) ON DELETE SET NULL,
      CONSTRAINT chk_stock_movements_type CHECK (movementType IN ('goods_receipt','sale_issue','return_in','return_out','adjustment','transfer_out','transfer_in','reservation_hold','reservation_release')),
      CONSTRAINT chk_stock_movements_qty CHECK (qtyDelta <> 0)
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE INDEX idx_stock_movements_variant_created ON stock_movements (variantId, createdAt)');
    await queryRunner.query('CREATE INDEX idx_stock_movements_source ON stock_movements (sourceDocumentType, sourceDocumentId)');

    await queryRunner.query(`CREATE TABLE inventory_transfers (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      fromWarehouseId char(36) NOT NULL,
      toWarehouseId char(36) NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'draft',
      note varchar(255) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_inventory_transfers_from FOREIGN KEY (fromWarehouseId) REFERENCES warehouses(id),
      CONSTRAINT fk_inventory_transfers_to FOREIGN KEY (toWarehouseId) REFERENCES warehouses(id),
      CONSTRAINT chk_inventory_transfer_status CHECK (status IN ('draft','submitted','shipped','received','cancelled'))
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE inventory_transfer_items (
      id char(36) NOT NULL,
      transferId char(36) NOT NULL,
      variantId char(36) NOT NULL,
      qty decimal(12,3) NOT NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_inventory_transfer_items_transfer FOREIGN KEY (transferId) REFERENCES inventory_transfers(id) ON DELETE CASCADE,
      CONSTRAINT fk_inventory_transfer_items_variant FOREIGN KEY (variantId) REFERENCES product_variants(id),
      CONSTRAINT chk_inventory_transfer_items_qty CHECK (qty > 0)
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE inventory_reservations (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      variantId char(36) NOT NULL,
      warehouseId char(36) NULL,
      qty decimal(12,3) NOT NULL,
      sourceDocumentType varchar(48) NOT NULL,
      sourceDocumentId varchar(80) NOT NULL,
      status varchar(24) NOT NULL DEFAULT 'active',
      expiresAt datetime NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_inventory_reservations_variant FOREIGN KEY (variantId) REFERENCES product_variants(id),
      CONSTRAINT fk_inventory_reservations_warehouse FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE SET NULL,
      CONSTRAINT chk_inventory_reservations_status CHECK (status IN ('active','released','consumed','expired')),
      CONSTRAINT chk_inventory_reservations_qty CHECK (qty > 0)
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE INDEX idx_inventory_reservations_source ON inventory_reservations (sourceDocumentType, sourceDocumentId)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE inventory_reservations');
    await queryRunner.query('DROP TABLE inventory_transfer_items');
    await queryRunner.query('DROP TABLE inventory_transfers');
    await queryRunner.query('DROP TABLE stock_movements');
    await queryRunner.query('DROP TABLE inventory_lots');
    await queryRunner.query('DROP TABLE goods_receipt_items');
    await queryRunner.query('DROP TABLE goods_receipts');
    await queryRunner.query('DROP TABLE purchase_order_items');
    await queryRunner.query('DROP TABLE purchase_orders');
    await queryRunner.query('DROP TABLE warehouse_locations');
    await queryRunner.query('DROP TABLE warehouses');
    await queryRunner.query('DROP TABLE supplier_variants');
    await queryRunner.query('DROP TABLE supplier_contacts');
    await queryRunner.query('DROP TABLE suppliers');
  }
}
