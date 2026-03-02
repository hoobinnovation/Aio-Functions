import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'returns' })
export class Return {
  @PrimaryColumn('char',{length:36}) id!:string;
  @Column({type:'varchar',length:64}) storeId!:string;
  @Column({type:'char',length:36}) orderId!:string;
  @Column({type:'varchar',length:128}) uid!:string;
  @Column({type:'varchar',length:24}) status!:string;
  @CreateDateColumn({type:'datetime'}) requestedAt!:Date;
  @Column({type:'datetime',nullable:true}) approvedAt!:Date|null;
  @Column({type:'datetime',nullable:true}) rejectedAt!:Date|null;
}
