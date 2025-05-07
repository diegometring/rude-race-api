import 'reflect-metadata'; 
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from "typeorm"; 

@Entity('User') 
export class User {
    @PrimaryColumn('id')
    id!: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    name!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}