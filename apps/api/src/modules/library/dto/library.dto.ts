import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsString, Min } from 'class-validator';
import { ApiSuccessResponseDto } from '../../../common/dto/api-response.dto';
import { PlaylistSummaryDto } from '../../playlists/dto/public-playlist.dto';
import { SermonSummaryDto } from '../../../common/dto/public.dto';

export class SaveSermonDto {
  @ApiProperty()
  @IsString()
  sermonId!: string;
}

export class ListeningHistoryDto {
  @ApiProperty()
  @IsString()
  sermonId!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  progressSeconds!: number;

  @ApiProperty({ default: false })
  @IsBoolean()
  completed!: boolean;
}

export class LibraryHistoryItemDto extends SermonSummaryDto {
  @ApiProperty()
  historyId!: string;

  @ApiProperty()
  progressSeconds!: number;

  @ApiProperty()
  completed!: boolean;

  @ApiProperty()
  listenedAt!: Date;
}

export class LibraryDownloadItemDto extends SermonSummaryDto {
  @ApiPropertyOptional()
  downloadUrl?: string | null;
}

export class LibraryOverviewDto {
  @ApiProperty({ type: [SermonSummaryDto] })
  savedSermons!: SermonSummaryDto[];

  @ApiProperty({ type: [PlaylistSummaryDto] })
  playlists!: PlaylistSummaryDto[];

  @ApiProperty({ type: [LibraryHistoryItemDto] })
  listeningHistory!: LibraryHistoryItemDto[];

  @ApiProperty({ type: [LibraryDownloadItemDto] })
  downloads!: LibraryDownloadItemDto[];
}

export class LibraryOverviewResponseDto extends ApiSuccessResponseDto<LibraryOverviewDto> {
  @ApiProperty({ type: LibraryOverviewDto })
  override data: LibraryOverviewDto = undefined as unknown as LibraryOverviewDto;
}

export class LibraryHistoryDataDto {
  @ApiProperty({ type: [LibraryHistoryItemDto] })
  items!: LibraryHistoryItemDto[];
}

export class LibraryHistoryResponseDto extends ApiSuccessResponseDto<LibraryHistoryDataDto> {
  @ApiProperty({ type: LibraryHistoryDataDto })
  override data: LibraryHistoryDataDto = undefined as unknown as LibraryHistoryDataDto;
}

export class LibrarySavedDataDto {
  @ApiProperty({ type: [SermonSummaryDto] })
  items!: SermonSummaryDto[];
}

export class LibrarySavedResponseDto extends ApiSuccessResponseDto<LibrarySavedDataDto> {
  @ApiProperty({ type: LibrarySavedDataDto })
  override data: LibrarySavedDataDto = undefined as unknown as LibrarySavedDataDto;
}

export class LibraryDownloadsDataDto {
  @ApiProperty({ type: [LibraryDownloadItemDto] })
  items!: LibraryDownloadItemDto[];
}

export class LibraryDownloadsResponseDto extends ApiSuccessResponseDto<LibraryDownloadsDataDto> {
  @ApiProperty({ type: LibraryDownloadsDataDto })
  override data: LibraryDownloadsDataDto = undefined as unknown as LibraryDownloadsDataDto;
}
