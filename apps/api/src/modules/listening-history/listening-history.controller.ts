import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { ListeningHistoryDto } from '../library/dto/library.dto';
import { LibraryService } from '../library/library.service';

@ApiTags('listening-history')
@ApiBearerAuth()
@Controller('listening-history')
@UseGuards(JwtAuthGuard)
export class ListeningHistoryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Post()
  @ApiOperation({ summary: 'Record listening history' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: ListeningHistoryDto) {
    return this.libraryService.addListeningHistory(user.id, dto);
  }
}
