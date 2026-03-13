import { MigrationInterface, QueryRunner } from 'typeorm';

export class PrescriptionRequestFoundation1729400000000 implements MigrationInterface {
  name = 'PrescriptionRequestFoundation1729400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE prescription_requests (
      id char(36) NOT NULL,
      storeId varchar(64) NOT NULL,
      userId varchar(128) NOT NULL,
      customerName varchar(120) NULL,
      customerPhone varchar(32) NULL,
      customerWhatsAppPhone varchar(32) NULL,
      notes text NULL,
      status varchar(32) NOT NULL DEFAULT 'draft',
      statusMessage varchar(300) NULL,
      rejectionReason varchar(500) NULL,
      reviewNotes varchar(500) NULL,
      linkedOrderId char(36) NULL,
      reviewedByAdminId varchar(128) NULL,
      reviewedAt datetime NULL,
      submittedAt datetime NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_prescription_requests_linked_order FOREIGN KEY (linkedOrderId) REFERENCES orders(id) ON DELETE SET NULL,
      CONSTRAINT chk_prescription_requests_status CHECK (status IN ('draft','submitted','under_review','approved','rejected_unreadable','converted_to_order','cancelled'))
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE INDEX idx_prescription_requests_store_status_created ON prescription_requests (storeId, status, createdAt)');
    await queryRunner.query('CREATE INDEX idx_prescription_requests_user_created ON prescription_requests (userId, createdAt)');

    await queryRunner.query(`CREATE TABLE prescription_request_files (
      id char(36) NOT NULL,
      prescriptionRequestId char(36) NOT NULL,
      mediaAssetId char(36) NOT NULL,
      kind varchar(32) NOT NULL DEFAULT 'prescription_image',
      sortOrder int NOT NULL DEFAULT 0,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_prescription_request_files_request FOREIGN KEY (prescriptionRequestId) REFERENCES prescription_requests(id) ON DELETE CASCADE,
      CONSTRAINT fk_prescription_request_files_media FOREIGN KEY (mediaAssetId) REFERENCES media_assets(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE INDEX idx_prescription_request_files_request_sort ON prescription_request_files (prescriptionRequestId, sortOrder)');

    await queryRunner.query(`CREATE TABLE prescription_request_status_events (
      id char(36) NOT NULL,
      prescriptionRequestId char(36) NOT NULL,
      fromStatus varchar(32) NULL,
      toStatus varchar(32) NOT NULL,
      actorType varchar(24) NOT NULL,
      actorId varchar(128) NULL,
      note varchar(500) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_prescription_request_status_events_request FOREIGN KEY (prescriptionRequestId) REFERENCES prescription_requests(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE INDEX idx_prescription_request_status_events_request_created ON prescription_request_status_events (prescriptionRequestId, createdAt)');

    await queryRunner.query(`CREATE TABLE prescription_request_item_drafts (
      id char(36) NOT NULL,
      prescriptionRequestId char(36) NOT NULL,
      productId char(36) NOT NULL,
      variantId char(36) NOT NULL,
      qty int NOT NULL,
      note varchar(500) NULL,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_prescription_request_item_drafts_request FOREIGN KEY (prescriptionRequestId) REFERENCES prescription_requests(id) ON DELETE CASCADE,
      CONSTRAINT fk_prescription_request_item_drafts_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT,
      CONSTRAINT fk_prescription_request_item_drafts_variant FOREIGN KEY (variantId) REFERENCES product_variants(id) ON DELETE RESTRICT,
      CONSTRAINT chk_prescription_request_item_drafts_qty CHECK (qty > 0)
    ) ENGINE=InnoDB`);
    await queryRunner.query('CREATE INDEX idx_prescription_request_item_drafts_request ON prescription_request_item_drafts (prescriptionRequestId)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE prescription_request_item_drafts');
    await queryRunner.query('DROP TABLE prescription_request_status_events');
    await queryRunner.query('DROP TABLE prescription_request_files');
    await queryRunner.query('DROP TABLE prescription_requests');
  }
}
