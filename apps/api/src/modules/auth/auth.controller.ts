import { Body, Controller, Get, Headers, Ip, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OkResponseDto } from '../../common/dto/action-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthResponseDto, ProfileResponseDto } from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register listener account' })
  @ApiOkResponse({ type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.register(dto, {
      ipAddress,
      ...(userAgent !== undefined ? { userAgent } : {}),
    });
  }

  @Post('login')
  @Public()
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login and issue access/refresh tokens' })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.login(dto, {
      ipAddress,
      ...(userAgent !== undefined ? { userAgent } : {}),
      ...(dto.deviceFingerprint !== undefined ? { deviceFingerprint: dto.deviceFingerprint } : {}),
    });
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Rotate refresh token and issue new token pair' })
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(
    @Body() dto: RefreshDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.refresh(dto.refreshToken, {
      ipAddress,
      ...(userAgent !== undefined ? { userAgent } : {}),
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke session(s)' })
  @ApiOkResponse({ type: OkResponseDto })
  async logout(@CurrentUser() user: AuthenticatedUser, @Body() dto: LogoutDto) {
    return this.authService.logout(user.id, dto.refreshToken);
  }

  @Post('password/reset/request')
  @Public()
  @Throttle({ auth: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request password reset token' })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('password/reset/confirm')
  @Public()
  @ApiOperation({ summary: 'Reset password with reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('email/verify/request')
  @Public()
  @Throttle({ auth: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request email verification token' })
  async requestEmailVerification(@Body() dto: RequestEmailVerificationDto) {
    return this.authService.requestEmailVerification(dto.email);
  }

  @Post('email/verify/confirm')
  @Public()
  @ApiOperation({ summary: 'Verify email token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('me/sessions/logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all devices/sessions' })
  @ApiOkResponse({ type: OkResponseDto })
  async logoutAll(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile and entitlements' })
  @ApiOkResponse({ type: ProfileResponseDto })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }
}

@ApiTags('admin/auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Staff/admin login endpoint' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.adminLogin(dto, {
      ipAddress,
      ...(userAgent !== undefined ? { userAgent } : {}),
      ...(dto.deviceFingerprint !== undefined ? { deviceFingerprint: dto.deviceFingerprint } : {}),
    });
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Staff/admin refresh endpoint with rotation' })
  async refresh(
    @Body() dto: RefreshDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.adminRefresh(dto.refreshToken, {
      ipAddress,
      ...(userAgent !== undefined ? { userAgent } : {}),
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: OkResponseDto })
  async logout(@CurrentUser() user: AuthenticatedUser, @Body() dto: LogoutDto) {
    return this.authService.logout(user.id, dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current staff/admin profile with permissions' })
  @ApiOkResponse({ type: ProfileResponseDto })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id, { adminOnly: true });
  }
}
