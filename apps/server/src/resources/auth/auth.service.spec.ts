import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from '../cache/cache.service';
import { AuthService } from './auth.service';
import { MockMailService } from './mock-mail.service';
import { UserService } from '../user/user.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: CacheService,
          useValue: {
            deleteValue: jest.fn(),
            getValue: jest.fn(),
            setValue: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn(), verifyAsync: jest.fn() },
        },
        {
          provide: MockMailService,
          useValue: { sendAuthCode: jest.fn() },
        },
        {
          provide: UserService,
          useValue: {
            activateUser: jest.fn(),
            createPendingRegistration: jest.fn(),
            findOneByEmail: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
