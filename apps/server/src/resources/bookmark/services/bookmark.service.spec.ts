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
    } as unknown as jest.Mocked<Partial<Repository<Bookmark>>>;
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
      saveReason: '  Research browser agents  ',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        normalizedUrl: 'https://example.com/story?a=1&b=2',
        title: 'A useful story',
        tags: ['research', 'ai'],
        saveReason: 'Research browser agents',
      }),
    );
    expect(result.created).toBe(true);
  });

  it('returns a short content passage and source for only the requesting user', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'bookmark-1',
          title: 'Browser agents',
          url: 'https://example.com/agents',
          saveReason: 'Compare browser agent designs',
          content: `${'Background context. '.repeat(40)}Browser agents coordinate observations and actions.`,
        } as Bookmark,
      ]),
    };
    repository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

    const matches = await service.search(7, 'browser agents');

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'bookmark.userId = :userId',
      { userId: 7 },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('bookmark."content"'),
      { search: 'browser agents' },
    );
    expect(matches).toEqual([
      expect.objectContaining({
        bookmarkId: 'bookmark-1',
        sourceUrl: 'https://example.com/agents',
        passageField: 'content',
        passage: expect.stringContaining('Browser agents coordinate'),
        passageUrl: expect.stringContaining('#:~:text='),
      }),
    ]);
    expect(matches[0].passage.length).toBeLessThan(510);
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
