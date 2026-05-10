import type { Page, Route } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

const createJwt = (expiresAtSeconds: number) => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({
      sub: 'admin-user-1',
      exp: expiresAtSeconds,
      role: 'admin',
    }),
    'signature',
  ].join('.');
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

const meta = {
  page: 1,
  limit: 20,
  total: 1,
  hasNextPage: false,
};

const currentUser = {
  user: {
    id: 'admin-user-1',
    email: 'admin@wordcast.dev',
    displayName: 'Wordcast Admin',
    roles: ['admin'],
    permissions: [
      'sermon.edit',
      'sermon.publish',
      'upload.manage',
      'ai.review',
      'program.edit',
      'session.edit',
      'preacher.edit',
      'topic.edit',
      'user.manage',
      'audit.view',
    ],
  },
  subscription: null,
  entitlements: {
    transcriptAccess: true,
    downloadAccess: true,
    adFree: true,
    enhancedLinking: true,
  },
};

const preacher = {
  id: 'preacher-1',
  displayName: 'Apostle Michael Orokpo',
  slug: 'apostle-michael-orokpo',
  followerCount: 12450,
  country: 'Nigeria',
  profileImageUrl: null,
  ministryName: 'Encounter Jesus Ministries',
  sermonCount: 148,
  createdAt: '2026-03-01T08:00:00.000Z',
};

const program = {
  id: 'program-1',
  name: 'Revival Fire Conference',
  year: 2026,
  theme: 'The Sound of Awakening',
  organizer: 'Wordcast',
  programType: 'CONFERENCE',
  location: 'Lagos',
  startDate: '2026-03-10T00:00:00.000Z',
  endDate: '2026-03-12T00:00:00.000Z',
  coverImage: null,
};

const topic = {
  id: 'topic-1',
  name: 'Revival',
  slug: 'revival',
  description: 'Messages centered on spiritual awakening.',
  isActive: true,
  aliases: ['awakening'],
  sermonCount: 89,
};

const session = {
  id: 'session-1',
  name: 'Evening Charge',
  dayNumber: 1,
  sessionLabel: 'EVENING',
  sessionOrder: 1,
  sessionDate: '2026-03-10T18:00:00.000Z',
  sermonCount: 12,
  program: {
    id: program.id,
    name: program.name,
    slug: 'revival-fire-conference',
  },
};

const sermon = {
  id: 'sermon-1',
  title: 'The Burden of Prayer',
  status: 'REVIEW_PENDING',
  sourceType: 'MANUAL_UPLOAD',
  datePreached: '2026-03-10T18:30:00.000Z',
  createdAt: '2026-03-11T07:00:00.000Z',
  updatedAt: '2026-03-12T09:15:00.000Z',
  preacher: { id: preacher.id, displayName: preacher.displayName },
  program: { id: program.id, name: program.name },
  session: { id: session.id, name: session.name },
};

const uploadJob = {
  id: 'upload-job-1',
  source: 'MANUAL',
  status: 'PROCESSING_AUDIO',
  sourceUrl: null,
  fileName: 'burden-of-prayer.mp3',
  totalItems: 1,
  processedItems: 0,
  failedItemsCount: 0,
  canRetry: false,
  createdAt: '2026-03-11T06:55:00.000Z',
  updatedAt: '2026-03-11T07:05:00.000Z',
  sermon: { id: sermon.id, title: sermon.title, status: sermon.status },
  requestedBy: {
    id: currentUser.user.id,
    displayName: currentUser.user.displayName,
    email: currentUser.user.email,
  },
};

const json = (data: unknown, route: Route, init?: { meta?: typeof meta; status?: number }) =>
  route.fulfill({
    status: init?.status ?? 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: (init?.status ?? 200) < 400,
      data,
      ...(init?.meta ? { meta: init.meta } : {}),
    }),
  });

export async function installAdminApiMocks(page: Page) {
  await page.route('**/api/auth/login', async (route) => {
    const expiry = nowSeconds() + 60 * 60;

    await page.context().addCookies([
      {
        name: 'wc_admin_at',
        value: createJwt(expiry),
        url: BASE_URL,
        httpOnly: true,
        sameSite: 'Lax',
        expires: expiry,
      },
      {
        name: 'wc_admin_rt',
        value: `refresh-${expiry}`,
        url: BASE_URL,
        httpOnly: true,
        sameSite: 'Lax',
        expires: nowSeconds() + 30 * 24 * 60 * 60,
      },
    ]);

    await json({ ok: true }, route);
  });

  await page.route('**/api/auth/logout', async (route) => {
    await page.context().clearCookies();
    await json({ ok: true }, route);
  });

  await page.route('**/api/admin/**', async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;
    const { method } = route.request();

    if (method !== 'GET') {
      await json({ ok: true }, route);
      return;
    }

    if (pathname.endsWith('/api/admin/admin/auth/me')) {
      await json(currentUser, route);
      return;
    }

    if (pathname.endsWith('/api/admin/admin/dashboard/summary')) {
      await json(
        {
          totalSermons: 412,
          draftSermons: 27,
          processingSermons: 9,
          publishedSermons: 351,
          pendingAiReviews: 14,
          failedUploadJobs: 2,
          totalPrograms: 48,
          totalPreachers: 73,
        },
        route,
      );
      return;
    }

    if (pathname.endsWith('/api/admin/admin/sermons')) {
      await json({ items: [sermon] }, route, { meta });
      return;
    }

    if (pathname.endsWith('/api/admin/admin/upload-jobs')) {
      await json({ items: [uploadJob] }, route, { meta });
      return;
    }

    if (pathname.endsWith('/api/admin/programs')) {
      await json({ items: [program] }, route, { meta });
      return;
    }

    if (pathname.endsWith('/api/admin/preachers')) {
      await json({ items: [preacher] }, route, { meta });
      return;
    }

    if (pathname.endsWith('/api/admin/topics') || pathname.endsWith('/api/admin/admin/topics')) {
      await json({ items: [topic] }, route, { meta });
      return;
    }

    if (pathname.endsWith('/api/admin/sessions')) {
      await json([session], route);
      return;
    }

    await json({ items: [] }, route, { meta });
  });
}
