import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EntitlementsSummaryDto {
  @ApiProperty()
  transcriptAccess!: boolean;

  @ApiProperty()
  downloadAccess!: boolean;

  @ApiPropertyOptional()
  adFree?: boolean;

  @ApiPropertyOptional()
  enhancedLinking?: boolean;
}

export class PreacherSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  slug?: string;

  @ApiPropertyOptional()
  profileImageUrl?: string | null;
}

export class ProgramSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  slug?: string;

  @ApiPropertyOptional()
  year?: number | null;

  @ApiPropertyOptional()
  coverImage?: string | null;
}

export class SessionSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  slug?: string;
}

export class TopicSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class SermonSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  churchName?: string | null;

  @ApiPropertyOptional()
  datePreached?: string | null;

  @ApiPropertyOptional()
  durationSeconds?: number | null;

  @ApiPropertyOptional()
  publishedAt?: string | null;

  @ApiPropertyOptional({ type: PreacherSummaryDto })
  preacher?: PreacherSummaryDto | null;

  @ApiPropertyOptional({ type: ProgramSummaryDto })
  program?: ProgramSummaryDto | null;

  @ApiPropertyOptional({ type: SessionSummaryDto })
  session?: SessionSummaryDto | null;

  @ApiPropertyOptional({ type: [TopicSummaryDto] })
  topics?: TopicSummaryDto[];

  @ApiPropertyOptional()
  playbackUrl?: string | null;

  @ApiPropertyOptional({ type: EntitlementsSummaryDto })
  entitlements?: EntitlementsSummaryDto;
}

export class SoundBiteSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  quoteText?: string | null;

  @ApiPropertyOptional()
  startSeconds?: number | null;

  @ApiPropertyOptional()
  endSeconds?: number | null;

  @ApiPropertyOptional({ type: PreacherSummaryDto })
  preacher?: PreacherSummaryDto | null;

  @ApiPropertyOptional({ type: SermonSummaryDto })
  sermon?: SermonSummaryDto | null;

  @ApiPropertyOptional()
  playbackUrl?: string | null;

  @ApiPropertyOptional()
  durationSeconds?: number | null;
}
