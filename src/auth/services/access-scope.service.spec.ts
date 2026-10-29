import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AccessScopeService } from './access-scope.service';

describe('AccessScopeService', () => {
  const service = new AccessScopeService();
  const client: JwtPayload = {
    sub: 'client-id',
    email: 'client@example.com',
    role: Role.CLIENT,
    cinemaId: null,
  };

  it('allows clients to use authenticated read scopes', () => {
    expect(service.getCinemaIdForRead(client)).toBeNull();
  });

  it('does not allow clients to use administrative write scopes', () => {
    expect(() => service.getCinemaId(client)).toThrow(ForbiddenException);
  });
});
