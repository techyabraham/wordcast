import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class ApproveAiReviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  editedDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  editedTranscript?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topicIds?: string[];
}

export class RejectAiReviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
