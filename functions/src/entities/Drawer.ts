import { Column, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'drawers' })
export class Drawer { @PrimaryColumn('char',{length:36}) id!:string; @Column({type:'varchar',length:64}) storeId!:string; @Column({type:'char',length:36,nullable:true}) branchId!:string|null; @Column({type:'varchar',length:80}) name!:string; @Column({type:'varchar',length:24,default:'active'}) status!:string; }
