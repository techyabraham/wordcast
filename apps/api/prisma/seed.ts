import { PrismaClient, ProgramType, SessionLabel, SermonSourceType, SermonStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const permissions = [
  'sermon.create',
  'sermon.edit',
  'sermon.publish',
  'sermon.archive',
  'preacher.create',
  'preacher.edit',
  'topic.create',
  'topic.edit',
  'program.create',
  'program.edit',
  'session.create',
  'session.edit',
  'upload.manage',
  'ai.review',
  'user.manage',
  'role.manage',
] as const;

const rolePermissionMap: Record<string, string[]> = {
  listener: [],
  staff: [
    'sermon.create',
    'sermon.edit',
    'sermon.publish',
    'preacher.create',
    'preacher.edit',
    'topic.create',
    'topic.edit',
    'program.create',
    'program.edit',
    'session.create',
    'session.edit',
    'upload.manage',
    'ai.review',
  ],
  admin: permissions as unknown as string[],
};

const topics = [
  'Faith',
  'Prayer',
  'Revival',
  'Holiness',
  'Prosperity',
  'Purpose',
  'Leadership',
  'Evangelism',
  'Marriage',
  'Relationships',
  'Wisdom',
  'Healing',
  'Deliverance',
  'Discipleship',
  'Worship',
  'Grace',
  'Destiny',
  'Spiritual Growth',
] as const;

const topicAliases: Record<string, string[]> = {
  Faith: ['belief', 'trust in God'],
  Prayer: ['intercession', 'supplication'],
  Revival: ['awakening', 'renewal'],
  Holiness: ['sanctification'],
  Prosperity: ['kingdom wealth'],
  Purpose: ['calling'],
  Leadership: ['servant leadership'],
  Evangelism: ['soul winning'],
  Marriage: ['family life'],
  Relationships: ['godly relationships'],
  Wisdom: ['discernment'],
  Healing: ['divine healing'],
  Deliverance: ['freedom'],
  Discipleship: ['spiritual formation'],
  Worship: ['praise'],
  Grace: ['unmerited favor'],
  Destiny: ['divine destiny'],
  'Spiritual Growth': ['maturity in Christ'],
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

async function seedRbac() {
  for (const permissionCode of permissions) {
    await prisma.permission.upsert({
      where: { code: permissionCode },
      create: {
        code: permissionCode,
        name: permissionCode,
      },
      update: {
        name: permissionCode,
      },
    });
  }

  const roles = ['listener', 'staff', 'admin'];
  for (const roleCode of roles) {
    await prisma.role.upsert({
      where: { code: roleCode },
      create: {
        code: roleCode,
        name: roleCode,
      },
      update: {
        name: roleCode,
      },
    });
  }

  for (const roleCode of roles) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    const rolePermissions = rolePermissionMap[roleCode] ?? [];

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    for (const permissionCode of rolePermissions) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permissionCode } });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
        update: {},
      });
    }
  }
}

async function seedUsers() {
  const passwordHash = await argon2.hash('ChangeMe123!');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@wordcast.dev' },
    create: {
      email: 'admin@wordcast.dev',
      displayName: 'Wordcast Admin',
      passwordHash,
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
    },
    update: {
      displayName: 'Wordcast Admin',
      passwordHash,
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@wordcast.dev' },
    create: {
      email: 'staff@wordcast.dev',
      displayName: 'Wordcast Staff',
      passwordHash,
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
    },
    update: {
      displayName: 'Wordcast Staff',
      passwordHash,
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
    },
  });

  const listenerUser = await prisma.user.upsert({
    where: { email: 'listener@wordcast.dev' },
    create: {
      email: 'listener@wordcast.dev',
      displayName: 'Wordcast Listener',
      passwordHash,
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
    },
    update: {
      displayName: 'Wordcast Listener',
      passwordHash,
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
    },
  });

  const roleByCode = Object.fromEntries(
    (await prisma.role.findMany()).map((role) => [role.code, role.id]),
  ) as Record<string, string>;

  const assignments = [
    { userId: adminUser.id, roleCode: 'admin' },
    { userId: staffUser.id, roleCode: 'staff' },
    { userId: listenerUser.id, roleCode: 'listener' },
  ];

  for (const assignment of assignments) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: assignment.userId,
          roleId: roleByCode[assignment.roleCode],
        },
      },
      create: {
        userId: assignment.userId,
        roleId: roleByCode[assignment.roleCode],
      },
      update: {},
    });
  }

  return { adminUser, staffUser, listenerUser };
}

async function seedPlans() {
  await prisma.plan.upsert({
    where: { code: 'free' },
    create: {
      code: 'free',
      name: 'Free',
      description: 'Standard streaming access',
      amountKobo: 0,
      interval: 'MONTHLY',
      transcriptAccess: false,
      downloadAccess: false,
      adFree: false,
      enhancedLinking: false,
    },
    update: {
      amountKobo: 0,
      interval: 'MONTHLY',
    },
  });

  await prisma.plan.upsert({
    where: { code: 'premium_monthly' },
    create: {
      code: 'premium_monthly',
      name: 'Premium Monthly',
      description: 'Transcripts and downloads',
      amountKobo: 350000,
      interval: 'MONTHLY',
      transcriptAccess: true,
      downloadAccess: true,
      adFree: true,
      enhancedLinking: true,
      paystackPlanCode: 'PLN_wordcast_monthly',
    },
    update: {
      amountKobo: 350000,
      interval: 'MONTHLY',
      transcriptAccess: true,
      downloadAccess: true,
      adFree: true,
      enhancedLinking: true,
    },
  });
}

async function seedTopics() {
  for (const topic of topics) {
    const slug = slugify(topic);

    const topicRecord = await prisma.topic.upsert({
      where: { slug },
      create: {
        slug,
        name: topic,
        isSystem: true,
        isActive: true,
      },
      update: {
        name: topic,
        isSystem: true,
        isActive: true,
      },
    });

    const aliases = topicAliases[topic] ?? [];

    await prisma.topicAlias.deleteMany({ where: { topicId: topicRecord.id } });
    if (aliases.length) {
      await prisma.topicAlias.createMany({
        data: aliases.map((alias) => ({
          topicId: topicRecord.id,
          alias,
          normalized: alias.toLowerCase(),
        })),
        skipDuplicates: true,
      });
    }
  }
}

interface SeedUsers {
  adminUser: { id: string };
  staffUser: { id: string };
  listenerUser: { id: string };
}

async function seedSampleContent(users: SeedUsers) {
  const ministry = await prisma.ministry.upsert({
    where: { slug: 'living-faith-church' },
    create: {
      slug: 'living-faith-church',
      name: 'Living Faith Church Worldwide',
      country: 'Nigeria',
      city: 'Ota',
    },
    update: {},
  });

  const preacher = await prisma.preacher.upsert({
    where: { slug: 'bishop-david-oyedepo' },
    create: {
      slug: 'bishop-david-oyedepo',
      displayName: 'Bishop David Oyedepo',
      biography: 'Founder of Living Faith Church Worldwide.',
      ministryId: ministry.id,
    },
    update: {
      displayName: 'Bishop David Oyedepo',
      ministryId: ministry.id,
    },
  });

  const program = await prisma.program.upsert({
    where: { slug: 'shiloh-2025' },
    create: {
      slug: 'shiloh-2025',
      name: 'Shiloh',
      year: 2025,
      theme: 'Unveiling Kingdom Advancement Keys',
      organizer: 'Living Faith Church Worldwide',
      programType: ProgramType.CONFERENCE,
      location: 'Canaanland, Ota, Nigeria',
      startDate: new Date('2025-12-09T00:00:00.000Z'),
      endDate: new Date('2025-12-14T00:00:00.000Z'),
      description: 'Annual prophetic gathering.',
      ministryId: ministry.id,
    },
    update: {
      year: 2025,
      theme: 'Unveiling Kingdom Advancement Keys',
    },
  });

  const session = await prisma.session.upsert({
    where: { slug: 'shiloh-2025-evening-session-1' },
    create: {
      slug: 'shiloh-2025-evening-session-1',
      programId: program.id,
      name: 'Evening Encounter Session 1',
      dayNumber: 1,
      sessionLabel: SessionLabel.EVENING,
      sessionOrder: 1,
      sessionDate: new Date('2025-12-09T00:00:00.000Z'),
      startTime: new Date('2025-12-09T17:00:00.000Z'),
      endTime: new Date('2025-12-09T20:00:00.000Z'),
    },
    update: {
      name: 'Evening Encounter Session 1',
      sessionOrder: 1,
    },
  });

  const sermon = await prisma.sermon.upsert({
    where: { slug: 'the-force-of-revival-faith' },
    create: {
      slug: 'the-force-of-revival-faith',
      title: 'The Force of Revival Faith',
      preacherId: preacher.id,
      programId: program.id,
      sessionId: session.id,
      createdById: users.staffUser.id,
      churchName: 'Living Faith Church Worldwide',
      datePreached: new Date('2025-12-09T18:00:00.000Z'),
      durationSeconds: 3720,
      description: 'Teaching on sustaining faith in revival seasons.',
      language: 'en',
      sourceType: SermonSourceType.MANUAL_UPLOAD,
      speakerRole: 'LEAD_PASTOR',
      status: SermonStatus.PUBLISHED,
      publishedAt: new Date('2025-12-10T08:00:00.000Z'),
    },
    update: {
      title: 'The Force of Revival Faith',
      preacherId: preacher.id,
      status: SermonStatus.PUBLISHED,
      publishedAt: new Date('2025-12-10T08:00:00.000Z'),
    },
  });

  const faithTopic = await prisma.topic.findUniqueOrThrow({ where: { slug: 'faith' } });
  await prisma.sermonTopic.upsert({
    where: {
      sermonId_topicId: {
        sermonId: sermon.id,
        topicId: faithTopic.id,
      },
    },
    create: {
      sermonId: sermon.id,
      topicId: faithTopic.id,
      relevance: 0.98,
    },
    update: {
      relevance: 0.98,
    },
  });

  const playlist = await prisma.playlist.upsert({
    where: { id: '00000000-0000-0000-0000-000000000111' },
    create: {
      id: '00000000-0000-0000-0000-000000000111',
      userId: users.listenerUser.id,
      name: 'Revival Essentials',
      description: 'Sermons for personal revival.',
      isPublic: false,
    },
    update: {
      userId: users.listenerUser.id,
      name: 'Revival Essentials',
    },
  });

  await prisma.playlistSermon.upsert({
    where: {
      playlistId_sermonId: {
        playlistId: playlist.id,
        sermonId: sermon.id,
      },
    },
    create: {
      playlistId: playlist.id,
      sermonId: sermon.id,
      position: 1,
    },
    update: {
      position: 1,
    },
  });

  await prisma.preacherFollow.upsert({
    where: {
      userId_preacherId: {
        userId: users.listenerUser.id,
        preacherId: preacher.id,
      },
    },
    create: {
      userId: users.listenerUser.id,
      preacherId: preacher.id,
    },
    update: {},
  });

  await prisma.preacher.update({
    where: { id: preacher.id },
    data: { followerCount: 1 },
  });
}

async function main() {
  await seedRbac();
  const users = await seedUsers();
  await seedPlans();
  await seedTopics();
  await seedSampleContent(users);

  console.info('Seed completed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
