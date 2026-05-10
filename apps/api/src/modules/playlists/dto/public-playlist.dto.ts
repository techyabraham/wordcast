import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-response.dto';
import { PreacherSummaryDto } from '../../../common/dto/public.dto';

export class PlaylistOwnerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;
}

export class PlaylistSermonItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional({ type: PreacherSummaryDto, nullable: true })
  preacher?: PreacherSummaryDto | null;

  @ApiPropertyOptional()
  playbackUrl?: string | null;

  @ApiPropertyOptional()
  addedAt?: Date;

  @ApiPropertyOptional()
  position?: number;
}

export class PlaylistSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  sermonCount!: number;

  @ApiProperty({ type: PlaylistOwnerDto })
  owner!: PlaylistOwnerDto;

  @ApiProperty()
  isPrivate!: boolean;

  @ApiPropertyOptional()
  updatedAt?: Date;
}

export class PlaylistDetailDto extends PlaylistSummaryDto {
  @ApiProperty({ type: [PlaylistSermonItemDto] })
  sermons!: PlaylistSermonItemDto[];
}

export class PlaylistListDataDto {
  @ApiProperty({ type: [PlaylistSummaryDto] })
  items!: PlaylistSummaryDto[];
}

export class PlaylistListResponseDto extends ApiSuccessResponseDto<PlaylistListDataDto> {
  @ApiProperty({ type: PlaylistListDataDto })
  override data: PlaylistListDataDto = undefined as unknown as PlaylistListDataDto;
}

export class PlaylistDetailResponseDto extends ApiSuccessResponseDto<PlaylistDetailDto> {
  @ApiProperty({ type: PlaylistDetailDto })
  override data: PlaylistDetailDto = undefined as unknown as PlaylistDetailDto;
}



