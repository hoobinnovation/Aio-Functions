import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'governorates' })
export class Governorate {
  @PrimaryColumn('char', { length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 80 }) name!: string;
  @Column({ type: 'varchar', length: 24, default: 'active' }) status!: string;
}
