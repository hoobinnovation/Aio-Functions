import { Column, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'return_items' })
export class ReturnItem { @PrimaryColumn('char',{length:36}) id!:string; @Column({type:'char',length:36}) returnId!:string; @Column({type:'char',length:36}) orderItemId!:string; @Column({type:'int'}) qty!:number; }
