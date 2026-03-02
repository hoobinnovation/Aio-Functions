import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'product_attributes' })
@Index('IDX_product_attributes_store_key_value', ['storeId', 'attrKey', 'attrValue'])
@Index('IDX_product_attributes_product', ['productId'])
export class ProductAttributeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 36 })
  @Index('IDX_product_attributes_store')
  storeId!: string;

  @Column({ type: 'char', length: 36 })
  productId!: string;

  @Column({ type: 'varchar', length: 64 })
  attrKey!: string;

  @Column({ type: 'varchar', length: 128 })
  attrValue!: string;
}
