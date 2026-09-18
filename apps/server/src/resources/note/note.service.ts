import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { normalizeTags } from '../../shared/utils/normalization';
import { CreateNoteDto } from './dto/create-note.dto';
import { FindNotesDto } from './dto/find-notes.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note } from './entities/note.entity';

const toNoteResponse = (note: Note) => ({
  id: note.id,
  title: note.title,
  body: note.body,
  sourceUrl: note.sourceUrl ?? null,
  selectedText: note.selectedText ?? null,
  tags: note.tags,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});

@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(Note)
    private readonly notes: Repository<Note>,
  ) {}

  async create(userId: number, request: CreateNoteDto) {
    const data = await this.notes.save(
      this.notes.create({
        userId,
        title: request.title.trim(),
        body: request.body.trim(),
        sourceUrl: request.sourceUrl ?? null,
        selectedText: request.selectedText ?? null,
        tags: normalizeTags(request.tags),
      }),
    );
    return { message: 'Note saved successfully', data: toNoteResponse(data) };
  }

  async findAll(userId: number, query: FindNotesDto) {
    const builder = this.notes
      .createQueryBuilder('note')
      .where('note.userId = :userId', { userId });
    const search = query.search?.trim();
    if (search) {
      builder.andWhere(
        new Brackets((subquery) => {
          subquery
            .where('note.title ILIKE :search', { search: `%${search}%` })
            .orWhere('note.body ILIKE :search', { search: `%${search}%` });
        }),
      );
    }
    const [items, total] = await builder
      .orderBy('note.updatedAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      message: 'Notes found successfully',
      data: {
        items: items.map(toNoteResponse),
        page: query.page,
        limit: query.limit,
        total,
        pageCount: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(userId: number, id: string) {
    return {
      message: 'Note found successfully',
      data: toNoteResponse(await this.findUserNote(userId, id)),
    };
  }

  async update(userId: number, id: string, request: UpdateNoteDto) {
    const note = await this.findUserNote(userId, id);
    const data = await this.notes.save(
      this.notes.merge(note, {
        ...(request.title === undefined ? {} : { title: request.title.trim() }),
        ...(request.body === undefined ? {} : { body: request.body.trim() }),
        ...(request.tags === undefined
          ? {}
          : { tags: normalizeTags(request.tags) }),
      }),
    );
    return { message: 'Note updated successfully', data: toNoteResponse(data) };
  }

  async remove(userId: number, id: string) {
    await this.findUserNote(userId, id);
    await this.notes.softDelete({ id, userId });
    return { message: 'Note deleted successfully' };
  }

  private async findUserNote(userId: number, id: string) {
    const note = await this.notes.findOne({ where: { id, userId } });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }
}
