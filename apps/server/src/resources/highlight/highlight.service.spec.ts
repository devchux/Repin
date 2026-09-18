import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Highlight } from './entities/highlight.entity';
import { HighlightService } from './highlight.service';

describe('HighlightService', () => {
  let service: HighlightService;
  let repository: jest.Mocked<Partial<Repository<Highlight>>>;

  beforeEach(async () => {
    repository = {
      create: jest.fn((value) => value as Highlight),
      save: jest.fn(
        async (value) =>
          ({
            ...value,
            id: 'highlight-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          }) as Highlight,
      ),
      findOne: jest.fn(),
      merge: jest.fn((target, value) => Object.assign(target, value)),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<Partial<Repository<Highlight>>>;
    const module = await Test.createTestingModule({
      providers: [
        HighlightService,
        { provide: getRepositoryToken(Highlight), useValue: repository },
      ],
    }).compile();
    service = module.get(HighlightService);
  });

  it('keeps quote context and normalized page identity when saving', async () => {
    const result = await service.create(7, {
      url: 'https://EXAMPLE.com/story?utm_source=email#selection',
      pageTitle: '  Example story  ',
      quote: '  Browser agents need observations.  ',
      prefix: 'The preceding sentence.',
      suffix: 'The next sentence.',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        normalizedUrl: 'https://example.com/story',
        quote: '  Browser agents need observations.  ',
        prefix: 'The preceding sentence.',
        suffix: 'The next sentence.',
      }),
    );
    expect(result.data).toMatchObject({
      id: 'highlight-1',
      quote: '  Browser agents need observations.  ',
      color: 'yellow',
    });
    expect(result.data).not.toHaveProperty('userId');
    expect(result.created).toBe(true);
  });

  it('returns the prior highlight when a client retries the same request', async () => {
    repository.findOne = jest.fn().mockResolvedValue({
      id: 'highlight-1',
      userId: 7,
      url: 'https://example.com/story',
      pageTitle: 'Story',
      quote: 'Selected text',
      color: 'yellow',
    } as Highlight);

    const result = await service.create(7, {
      clientId: '84557b41-b5f1-4d92-a596-435a9f93f27f',
      url: 'https://example.com/story',
      pageTitle: 'Story',
      quote: 'Selected text',
    });

    expect(result.created).toBe(false);
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { userId: 7, clientId: '84557b41-b5f1-4d92-a596-435a9f93f27f' },
    });
  });

  it('does not expose another user’s highlight', async () => {
    repository.findOne = jest.fn().mockResolvedValue(null);

    await expect(service.findOne(7, 'highlight-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'highlight-1', userId: 7 },
    });
  });

  it('soft deletes only after checking ownership', async () => {
    repository.findOne = jest.fn().mockResolvedValue({ id: 'highlight-1' });

    await service.remove(7, 'highlight-1');

    expect(repository.softDelete).toHaveBeenCalledWith({
      id: 'highlight-1',
      userId: 7,
    });
  });
});
