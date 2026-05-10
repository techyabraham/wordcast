import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResponseDto, SearchSuggestionsResponseDto } from './dto/search-response.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search sermons, preachers, programs and topics' })
  @ApiOkResponse({ type: SearchResponseDto })
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  search(@Query() query: SearchQueryDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.searchService.search(query, user?.id);
  }

  @Get('suggestions')
  @Public()
  @ApiOperation({ summary: 'Search suggestions grouped by type' })
  @ApiOkResponse({ type: SearchSuggestionsResponseDto })
  searchSuggestions(@Query() query: SearchQueryDto) {
    return this.searchService.suggestions(query);
  }
}
