import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { LibraryItem } from './entities/library-item.entity';
import { LibraryService } from './library.service';

describe('LibraryService', () => {
  const repository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'item-1', ...value })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<LibraryItem>>;
  const service = new LibraryService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('requires meaningful saved content', async () => {
    await expect(service.create(3, { type: 'note' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('loads a source using both its ID and owner', async () => {
    repository.findOne.mockResolvedValueOnce(null);
    await expect(
      service.findOwned(3, '2cc3d0f3-f95a-497d-9d6d-d5943585257d'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: {
        id: '2cc3d0f3-f95a-497d-9d6d-d5943585257d',
        userId: 3,
      },
    });
  });
});
