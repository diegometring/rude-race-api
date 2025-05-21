import 'reflect-metadata'; 
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from "typeorm"; 
import { OneToMany } from 'typeorm';
import { Match } from './Match';

@Entity('User') 
export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    name!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @OneToMany(() => Match, (match) => match.user)
    matches!: Match[];

}