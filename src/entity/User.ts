import 'reflect-metadata'; 
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"; 

@Entity('User') 
export class User {
    @PrimaryGeneratedColumn('id')
    id!: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    name!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}