import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreateNoteDto } from './dto/create-note.dto';
import { Note } from './entities/note.entity';
import { NoteService } from './note.service';

describe('NoteService', () => {
  const repository = {
    create: jest.fn((value: Partial<Note>) => value),
    save: jest.fn(async (value: Partial<Note>) => ({ id: 'note-1', ...value })),
    findOne: jest.fn(),
    merge: jest.fn((note: Note, value: Partial<Note>) => ({
      ...note,
      ...value,
    })),
    softDelete: jest.fn(),
  };
  const service = new NoteService(repository as unknown as Repository<Note>);

  beforeEach(() => jest.clearAllMocks());

  it('creates a user-owned note with normalized tags', async () => {
    const request = {
      title: '  Research  ',
      body: '  Keep this thought  ',
      sourceUrl: 'https://example.com/article',
      tags: [' Ideas ', 'ideas', 'WORK'],
    } as CreateNoteDto;

    const result = await service.create(7, request);

    expect(repository.create).toHaveBeenCalledWith({
      userId: 7,
      title: 'Research',
      body: 'Keep this thought',
      sourceUrl: 'https://example.com/article',
      selectedText: null,
      tags: ['ideas', 'work'],
    });
    expect(result.data.id).toBe('note-1');
  });

  it('does not expose another user’s note', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(7, 'note-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'note-1', userId: 7 },
    });
  });

  it('verifies ownership before deleting a note', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.remove(7, 'note-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.softDelete).not.toHaveBeenCalled();
  });
});
