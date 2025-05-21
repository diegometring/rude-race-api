import 'reflect-metadata'
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';

@Entity('Match')
export class Match {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User, (user) => user.matches, { nullable: false, onDelete: 'CASCADE' })
    user!: User;

    @Column({ type: 'int' })
    score!: number;

    @CreateDateColumn()
    playedAt!: Date; // você pode usar uma coluna customizada ou manter o padrão como data da partida
}
