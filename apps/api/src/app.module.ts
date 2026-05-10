import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { parseEnv } from '@wordcast/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { SermonsModule } from './modules/sermons/sermons.module';
import { PreachersModule } from './modules/preachers/preachers.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { TopicsModule } from './modules/topics/topics.module';
import { SoundBitesModule } from './modules/sound-bites/sound-bites.module';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { LibraryModule } from './modules/library/library.module';
import { SearchModule } from './modules/search/search.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { UploadJobsModule } from './modules/upload-jobs/upload-jobs.module';
import { AiReviewModule } from './modules/ai-review/ai-review.module';
import { AuditModule } from './modules/audit/audit.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { QueuesModule } from './modules/queues/queues.module';
import { MediaModule } from './modules/media/media.module';
import { ListeningHistoryModule } from './modules/listening-history/listening-history.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HomeModule } from './modules/home/home.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { CacheModule } from './modules/cache/cache.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (env) => parseEnv(env),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60_000,
        limit: 120,
      },
      {
        // Strict throttler applied only to auth-sensitive endpoints via @Throttle({ auth: ... })
        name: 'auth',
        ttl: 60_000,
        limit: 120, // Default high — overridden per-route to be restrictive
      },
    ]),
    PrismaModule,
    CacheModule,
    MediaModule,
    QueuesModule,
    AuditModule,
    RbacModule,
    AuthModule,
    UsersModule,
    SermonsModule,
    PreachersModule,
    ProgramsModule,
    SessionsModule,
    TopicsModule,
    SoundBitesModule,
    PlaylistsModule,
    LibraryModule,
    ListeningHistoryModule,
    HomeModule,
    SearchModule,
    SubscriptionsModule,
    PaymentsModule,
    UploadJobsModule,
    AiReviewModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
