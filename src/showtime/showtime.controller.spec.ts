import 'reflect-metadata';
jest.mock('./dto/update-showtime.dto', () => ({
  UpdateShowtimeDto: class UpdateShowtimeDto {},
}));

import { Role } from '@prisma/client';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { ShowtimeController } from './showtime.controller';

describe('ShowtimeController authorization', () => {
  it('allows clients to read showtimes without granting write access', () => {
    const getMetadata = (key: string, name: string): unknown => {
      const method = Object.getOwnPropertyDescriptor(
        ShowtimeController.prototype,
        name,
      )?.value as object;

      return Reflect.getMetadata(key, method) as unknown;
    };

    expect(getMetadata(ROLES_KEY, 'findAll')).toContain(Role.CLIENT);
    expect(getMetadata(ROLES_KEY, 'findById')).toContain(Role.CLIENT);
    expect(getMetadata(ROLES_KEY, 'update')).not.toContain(Role.CLIENT);
  });
});
