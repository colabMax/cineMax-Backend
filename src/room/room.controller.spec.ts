import 'reflect-metadata';
jest.mock('./dto/update-room.dto', () => ({
  UpdateRoomDto: class UpdateRoomDto {},
}));

import { Role } from '@prisma/client';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { RoomController } from './room.controller';

describe('RoomController authorization', () => {
  it('allows clients to read layouts without granting layout write access', () => {
    const readMethod = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
      'getLayout',
    )?.value as object;
    const writeMethod = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
      'updateLayout',
    )?.value as object;

    expect(Reflect.getMetadata(ROLES_KEY, readMethod) as unknown).toContain(
      Role.CLIENT,
    );
    expect(
      Reflect.getMetadata(ROLES_KEY, writeMethod) as unknown,
    ).not.toContain(Role.CLIENT);
  });
});
