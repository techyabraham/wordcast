import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest(err: unknown, user: any) {
    if (err) {
      return null;
    }
    return user ?? null;
  }
}
