import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateShowtimeDto } from './create-showtime.dto';

describe('CreateShowtimeDto', () => {
  const baseInput = {
    movieId: '6e3a3f1d-0d38-4f31-9679-a346aad1e213',
    roomId: '7e3a3f1d-0d38-4f31-9679-a346aad1e213',
    startTime: '2026-11-01T18:00:00.000Z',
  };

  it('accepts a positive price with at most two decimal places', async () => {
    const dto = plainToInstance(CreateShowtimeDto, {
      ...baseInput,
      price: 25.5,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([0, -1, 1.999])('rejects an invalid price: %s', async (price) => {
    const dto = plainToInstance(CreateShowtimeDto, {
      ...baseInput,
      price,
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
