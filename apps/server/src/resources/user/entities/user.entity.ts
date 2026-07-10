import { Base } from 'src/shared/entities/base.entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class User extends Base {
  @Column({ nullable: false })
  firstName: string;

  @Column({ nullable: false })
  lastName: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ default: false })
  isSuper?: boolean;
}
