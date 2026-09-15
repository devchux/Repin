import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookmark } from './entities/bookmark.entity';
import { BookmarkService } from './bookmark.service';

describe('BookmarkService', () => {
  let service: BookmarkService;
  let repository: jest.Mocked<Partial<Repository<Bookmark>>>;

  beforeEach(async () => {
    repository = {
      create: jest.fn((value) => value as Bookmark),
      findOne: jest.fn(),
      merge: jest.fn((target, value) => Object.assign(target, value)),
      save: jest.fn(async (value) => value as Bookmark),
      softDelete: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        BookmarkService,
        { provide: getRepositoryToken(Bookmark), useValue: repository },
      ],
    }).compile();
    service = module.get(BookmarkService);
  });

  it('normalizes URLs and tags when saving', async () => {
    repository.findOne = jest.fn().mockResolvedValue(null);

    const result = await service.create(7, {
      url: 'https://EXAMPLE.com/story/?utm_source=newsletter&b=2&a=1#intro',
      title: '  A useful story  ',
      tags: [' Research ', 'research', 'AI'],
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        normalizedUrl: 'https://example.com/story?a=1&b=2',
        title: 'A useful story',
        tags: ['research', 'ai'],
      }),
    );
    expect(result.created).toBe(true);
  });

  it('returns the existing user page for a duplicate URL', async () => {
    const existing = { id: 'page-id', userId: 7 } as Bookmark;
    repository.findOne = jest.fn().mockResolvedValue(existing);

    const result = await service.create(7, {
      url: 'https://example.com/story',
      title: 'Story',
    });

    expect(repository.save).not.toHaveBeenCalled();
    expect(result).toEqual({
      message: 'Bookmark already saved',
      data: existing,
      created: false,
    });
  });

  it('does not expose another user page', async () => {
    repository.findOne = jest.fn().mockResolvedValue(null);

    await expect(service.findOne(7, 'page-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'page-id', userId: 7 },
    });
  });

  it('soft deletes only after verifying ownership', async () => {
    repository.findOne = jest
      .fn()
      .mockResolvedValue({ id: 'page-id', userId: 7 } as Bookmark);

    await service.remove(7, 'page-id');

    expect(repository.softDelete).toHaveBeenCalledWith({
      id: 'page-id',
      userId: 7,
    });
  });
});
