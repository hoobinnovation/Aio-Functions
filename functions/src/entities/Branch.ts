import { Column, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'branches' })
export class Branch { @PrimaryColumn('char',{length:36}) id!:string; @Column({type:'varchar',length:64}) storeId!:string; @Column({type:'varchar',length:120}) name!:string; @Column({type:'varchar',length:24,default:'active'}) status!:string; }
