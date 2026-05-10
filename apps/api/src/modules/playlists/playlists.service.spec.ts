import { Test } from '@nestjs/testing';
import { PlaylistsService } from './playlists.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PlaylistsService', () => {
  let service: PlaylistsService;

  const prisma = {
    playlist: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    playlistSermon: {
      aggregate: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [PlaylistsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PlaylistsService);
  });

  it('creates playlist for user', async () => {
    prisma.playlist.create.mockResolvedValue({
      id: 'playlist-1',
      name: 'My Playlist',
      description: 'desc',
      isPublic: false,
      updatedAt: new Date('2026-03-22T00:00:00.000Z'),
      user: { id: 'user-1', displayName: 'Listener' },
      sermons: [],
    });

    const result = await service.create('user-1', {
      name: 'My Playlist',
      description: 'desc',
    });

    expect(result.id).toBe('playlist-1');
    expect(prisma.playlist.create).toHaveBeenCalled();
  });
});
