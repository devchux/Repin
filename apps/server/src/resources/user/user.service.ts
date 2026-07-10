import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Status } from 'src/shared/types';
import { getLimitAndSkip, paginateResponse } from 'src/shared/utils/helper';
import { FindUserDto } from './dto/find-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { email: rawEmail, firstName, lastName } = createUserDto;
    const email = rawEmail.toLowerCase().trim();
    const user = await this.userRepository.findOne({ where: { email } });
    if (user && user.status !== Status.DELETED) {
      throw new BadRequestException('User already exists');
    }
    if (user && user.status === Status.DELETED) {
      const data = await this.updateUser(user.id, {
        firstName,
        lastName,
        email,
        status: Status.ACTIVE,
      });
      return { message: 'User restored successfully', data };
    }
    const data = this.userRepository.create({
      firstName,
      lastName,
      email,
      status: Status.ACTIVE,
    });
    await this.userRepository.save(data);
    return { message: 'User created successfully', data };
  }

  async findAll(params: FindUserDto) {
    const data = await this.findAllUsers(params);
    return data;
  }

  async findOne(id: number) {
    const data = await this.userRepository.findOne({ where: { id } });
    return { message: 'User found successfully', data };
  }

  async findOneByEmail(email: string) {
    const data = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    return data;
  }

  async createPendingRegistration(createUserDto: CreateUserDto) {
    const { email: rawEmail, firstName, lastName } = createUserDto;
    const email = rawEmail.toLowerCase().trim();
    const user = await this.userRepository.findOne({ where: { email } });

    if (user?.status === Status.ACTIVE) {
      throw new BadRequestException(
        'User already exists. Please login instead',
      );
    }

    if (user) {
      return this.updateUser(user.id, {
        firstName,
        lastName,
        email,
        status: Status.INACTIVE,
      });
    }

    const data = this.userRepository.create({
      firstName,
      lastName,
      email,
      status: Status.INACTIVE,
    });
    return this.userRepository.save(data);
  }

  async activateUser(id: number) {
    return this.updateUser(id, { status: Status.ACTIVE });
  }

  async isSuperUser(id: number) {
    const user = await this.userRepository.findOne({
      where: { id, status: Status.ACTIVE },
    });
    return Boolean(user?.isSuper);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const { firstName, lastName } = updateUserDto;
    const data = await this.updateUser(id, { firstName, lastName });
    return { message: 'User updated successfully', data };
  }

  async activate(id: number) {
    const data = await this.updateUser(id, { status: Status.ACTIVE });
    return { message: 'User activated successfully', data };
  }

  async deactivate(id: number) {
    const data = await this.updateUser(id, { status: Status.INACTIVE });
    return { message: 'User deactivated successfully', data };
  }

  async remove(id: number) {
    const data = await this.updateUser(id, { status: Status.DELETED });
    return { message: 'User deleted successfully', data };
  }

  private async updateUser(id: number, data: Partial<User>) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const entity = this.userRepository.create(data);
    await this.userRepository.update(id, entity);
    return { ...user, ...entity };
  }

  private async findAllUsers(params: FindUserDto) {
    const {
      page,
      limit,
      search,
      orderBy,
      status: statusParam,
      paginated = 'true',
    } = params;
    const order = orderBy ? { [orderBy]: 'ASC' } : {};
    const status = statusParam ? { status: statusParam } : {};
    const where = search
      ? [
          { firstName: Like(`%${search}%`), ...status },
          { lastName: Like(`%${search}%`), ...status },
          { email: Like(`%${search}%`), ...status },
        ]
      : status;
    if (paginated === 'false') {
      const data = await this.userRepository.find({ where });
      return { message: 'Users found successfully', data };
    }
    const { skip, take } = getLimitAndSkip(limit, page);
    const data = await this.userRepository.findAndCount({
      where,
      order,
      skip,
      take,
    });
    return {
      message: 'Users found successfully',
      data: paginateResponse(data, page, limit),
    };
  }
}
