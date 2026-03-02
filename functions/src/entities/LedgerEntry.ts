import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'ledger_entries' })
export class LedgerEntry {
  @PrimaryColumn('char',{length:36}) id!:string;
  @Column({type:'varchar',length:64}) storeId!:string;
  @Column({type:'bigint'}) amountCents!:string;
  @Column({type:'varchar',length:40}) type!:string;
  @Column({type:'varchar',length:24}) channel!:string;
  @Column({type:'char',length:36,nullable:true}) branchId!:string|null;
  @Column({type:'char',length:36,nullable:true}) deviceId!:string|null;
  @Column({type:'char',length:36,nullable:true}) employeeId!:string|null;
  @Column({type:'char',length:36,nullable:true}) drawerSessionId!:string|null;
  @Column({type:'varchar',length:40}) refType!:string;
  @Column({type:'varchar',length:64}) refId!:string;
  @CreateDateColumn({type:'datetime'}) createdAt!:Date;
}
