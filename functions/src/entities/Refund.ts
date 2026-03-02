import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'refunds' })
export class Refund { @PrimaryColumn('char',{length:36}) id!:string; @Column({type:'char',length:36}) returnId!:string; @Column({type:'bigint'}) amountCents!:string; @Column({type:'varchar',length:24}) method!:string; @Column({type:'varchar',length:24}) status!:string; @CreateDateColumn({type:'datetime'}) createdAt!:Date; }
