import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'drawer_sessions' })
export class DrawerSession {
  @PrimaryColumn('char',{length:36}) id!:string;
  @Column({type:'char',length:36}) drawerId!:string;
  @Column({type:'varchar',length:128}) openedByUid!:string;
  @Column({type:'datetime'}) openedAt!:Date;
  @Column({type:'varchar',length:128,nullable:true}) closedByUid!:string|null;
  @Column({type:'datetime',nullable:true}) closedAt!:Date|null;
  @Column({type:'bigint'}) openingBalanceCents!:string;
  @Column({type:'bigint',nullable:true}) closingBalanceCents!:string|null;
  @CreateDateColumn({type:'datetime'}) createdAt!:Date;
}
