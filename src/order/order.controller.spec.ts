import 'reflect-metadata';
import { Role } from '@prisma/client';
jest.mock('./dto/create-order.dto', () => ({
  CreateOrderDto: class CreateOrderDto {},
}));

import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { OrderController } from './order.controller';

describe('OrderController', () => {
  it('restricts order creation to authenticated clients', () => {
    const method = Object.getOwnPropertyDescriptor(
      OrderController.prototype,
      'create',
    )?.value as object;

    expect(Reflect.getMetadata(ROLES_KEY, method) as unknown).toEqual([
      Role.CLIENT,
    ]);
    expect(Reflect.getMetadata('__guards__', method) as unknown).toHaveLength(
      2,
    );
  });
});
