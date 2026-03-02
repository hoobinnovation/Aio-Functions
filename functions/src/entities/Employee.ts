import { Column, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'employees' })
export class Employee { @PrimaryColumn('char',{length:36}) id!:string; @Column({type:'varchar',length:64}) storeId!:string; @Column({type:'varchar',length:128}) uid!:string; @Column({type:'varchar',length:80}) role!:string; @Column({type:'varchar',length:24,default:'active'}) status!:string; }
