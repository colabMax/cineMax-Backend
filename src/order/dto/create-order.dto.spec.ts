import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrderDto } from './create-order.dto';

describe('CreateOrderDto', () => {
  const showtimeId = '6e3a3f1d-0d38-4f31-9679-a346aad1e213';
  const seatA = '7e3a3f1d-0d38-4f31-9679-a346aad1e213';
  const seatB = '8e3a3f1d-0d38-4f31-9679-a346aad1e213';

  it('accepts up to six unique seat UUIDs', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      showtimeId,
      seatIds: [seatA, seatB],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([
    ['no seats', []],
    ['duplicate seats', [seatA, seatA]],
    ['invalid seat UUID', ['not-a-uuid']],
    [
      'more than six seats',
      Array.from({ length: 7 }, (_, index) => {
        const prefix = (index + 1).toString(16).padStart(8, '0');
        return `${prefix}-0d38-4f31-9679-a346aad1e213`;
      }),
    ],
  ])('rejects %s', async (_reason, seatIds) => {
    const dto = plainToInstance(CreateOrderDto, { showtimeId, seatIds });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
