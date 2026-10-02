import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { CatalogController } from '../src/catalog/catalog.controller';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { UserController } from '../src/user/user.controller';
import { UserService } from '../src/user/user.service';
import { RoomController } from '../src/room/room.controller';
import { RoomService } from '../src/room/room.service';
import { MovieController } from '../src/movie/movie.controller';
import { MovieService } from '../src/movie/movie.service';
import { ShowtimeController } from '../src/showtime/showtime.controller';
import { ShowtimeService } from '../src/showtime/showtime.service';
import { CinemaService } from '../src/cinema/cinema.service';
import { AccessScopeService } from '../src/auth/services/access-scope.service';
import { PrismaService } from '../src/prisma/prisma.service';

const cinemaId = '11111111-1111-4111-8111-111111111111';
const movieId = '22222222-2222-4222-8222-222222222222';
const roomId = '33333333-3333-4333-8333-333333333333';
const secret = 'local-integration-test-secret';
const database = {
  user: { findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  cinema: { findMany: jest.fn(), findUnique: jest.fn() },
  room: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
  movie: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  showtime: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
};
describe('Real HTTP contracts and cinema permissions', () => {
  let app: INestApplication;
  const previousSecret = process.env.JWT_SECRET;
  const token = (role: string) => new JwtService({ secret }).sign({ sub: role, role: 'SUPER_ADMIN', cinemaId: 'stale-cinema' });
  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    const module = await Test.createTestingModule({
      controllers: [CatalogController, AuthController, UserController, RoomController, MovieController, ShowtimeController],
      providers: [JwtStrategy, UserService, RoomService, MovieService, ShowtimeService, CinemaService, AccessScopeService,
        { provide: AuthService, useValue: {} }, { provide: PrismaService, useValue: database }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    database.user.findUnique.mockImplementation(({ where }) => Promise.resolve({
      id: where.id, name: 'Account', email: 'test@example.com', role: where.id,
      cinemaId: where.id === 'ADMIN_CINEMA' ? cinemaId : null, profileCompleted: false,
    }));
    database.cinema.findMany.mockResolvedValue([]);
  });
  afterAll(async () => {
    await app.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
  });
  it('serves a genuinely empty public catalog without authentication', async () => {
    const result = await request(app.getHttpServer()).get('/catalog').expect(200);
    expect(result.body).toEqual({ cinemas: [], activeCinema: null, movies: [] });
    expect(database.movie.findMany).not.toHaveBeenCalled();
  });
  it('restricts catalog movies to the selected cinema and future showtimes', async () => {
    database.cinema.findMany.mockResolvedValue([{ id: cinemaId, name: 'Cinema', address: 'Address' }]);
    database.movie.findMany.mockResolvedValue([]);
    await request(app.getHttpServer()).get('/catalog').query({ cinemaId }).expect(200);
    expect(database.movie.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { cinemaId }, select: expect.objectContaining({
        showtimes: expect.objectContaining({ where: { startTime: { gte: expect.any(Date) } } }),
      }),
    }));
  });
  it('returns 404 for a missing public movie', async () => {
    database.movie.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer()).get('/catalog/movie/missing').expect(404);
  });
  it('blocks anonymous access to users', async () => {
    await request(app.getHttpServer()).get('/user').expect(401);
    expect(database.user.findMany).not.toHaveBeenCalled();
  });
  it.each(['CLIENT', 'ADMIN_CINEMA'])('blocks %s from listing users even with an old superadmin claim', async role => {
    await request(app.getHttpServer()).get('/user').auth(token(role), { type: 'bearer' }).expect(403);
    expect(database.user.findMany).not.toHaveBeenCalled();
  });
  it('selects only safe user fields for the superadministrator', async () => {
    database.user.findMany.mockResolvedValue([]);
    await request(app.getHttpServer()).get('/user').auth(token('SUPER_ADMIN'), { type: 'bearer' }).expect(200);
    const selected = database.user.findMany.mock.calls[0][0].select;
    expect(selected.password).toBeUndefined();
    expect(selected.emailVerifications).toBeUndefined();
    expect(selected.role).toBe(true);
  });
  it('returns current role and name from the database in the session', async () => {
    const response = await request(app.getHttpServer()).get('/auth/me').auth(token('ADMIN_CINEMA'), { type: 'bearer' }).expect(200);
    expect(response.body).toMatchObject({ name: 'Account', role: 'ADMIN_CINEMA', cinemaId });
  });
  it('requires a cinema when a superadministrator creates a room', async () => {
    await request(app.getHttpServer()).post('/room').auth(token('SUPER_ADMIN'), { type: 'bearer' }).send({ name: 'Room', capacity: 50 }).expect(400);
    expect(database.room.create).not.toHaveBeenCalled();
  });
  it('creates a room in the administrator own cinema even if another is submitted', async () => {
    database.cinema.findUnique.mockResolvedValue({ id: cinemaId });
    database.room.create.mockResolvedValue({ id: roomId });
    await request(app.getHttpServer()).post('/room').auth(token('ADMIN_CINEMA'), { type: 'bearer' })
      .send({ name: 'Room', capacity: 50, cinemaId: movieId }).expect(201);
    expect(database.room.create).toHaveBeenCalledWith({ data: { name: 'Room', capacity: 50, cinemaId } });
  });
  it('rejects fractional room capacity', async () => {
    await request(app.getHttpServer()).post('/room').auth(token('SUPER_ADMIN'), { type: 'bearer' }).send({ name: 'Room', capacity: 2.5, cinemaId }).expect(400);
    expect(database.room.create).not.toHaveBeenCalled();
  });
  it('cannot edit a movie outside the assigned cinema', async () => {
    database.movie.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer()).patch('/movie/' + movieId).auth(token('ADMIN_CINEMA'), { type: 'bearer' }).send({ title: 'Updated' }).expect(404);
    expect(database.movie.findFirst).toHaveBeenCalledWith({ where: { id: movieId, cinemaId } });
    expect(database.movie.update).not.toHaveBeenCalled();
  });
  it('cannot schedule a movie in a room from another cinema', async () => {
    database.movie.findFirst.mockResolvedValue({ id: movieId, cinemaId });
    database.room.findFirst.mockResolvedValue({ id: roomId, cinemaId: 'other' });
    await request(app.getHttpServer()).post('/showtime').auth(token('SUPER_ADMIN'), { type: 'bearer' })
      .send({ movieId, roomId, startTime: '2030-01-01T20:00:00Z' }).expect(400);
    expect(database.showtime.create).not.toHaveBeenCalled();
  });
  it('does not update a showtime that does not exist in the assigned cinema', async () => {
    database.showtime.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer()).patch('/showtime/missing').auth(token('ADMIN_CINEMA'), { type: 'bearer' })
      .send({ startTime: '2030-01-01T20:00:00Z' }).expect(404);
    expect(database.showtime.update).not.toHaveBeenCalled();
  });
  it('blocks cinema administrators from assigning other administrators', async () => {
    await request(app.getHttpServer()).patch('/user/other/cinema-admin').auth(token('ADMIN_CINEMA'), { type: 'bearer' })
      .send({ cinemaId }).expect(403);
    expect(database.user.update).not.toHaveBeenCalled();
  });
});

describe('Bootstrap administrator and verification delivery', () => {
  const previousEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const cinemaService = {} as CinemaService;
  const service = new UserService(database as unknown as PrismaService, cinemaService);
  beforeEach(() => { jest.resetAllMocks(); process.env.BOOTSTRAP_ADMIN_EMAIL = 'owner@example.com'; });
  afterAll(() => { if (previousEmail === undefined) delete process.env.BOOTSTRAP_ADMIN_EMAIL; else process.env.BOOTSTRAP_ADMIN_EMAIL = previousEmail; });
  it.each([
    { email: 'other@example.com', emailVerified: true },
    { email: 'owner@example.com', emailVerified: false },
  ])('does not promote an unverified or different account: %j', async record => {
    database.user.findUnique.mockResolvedValue({ id: 'owner', ...record, role: 'CLIENT' });
    await service.bootstrapSuperAdmin('owner');
    expect(database.user.update).not.toHaveBeenCalled();
  });
  it('promotes the configured verified owner only when there is no superadministrator', async () => {
    database.user.findUnique.mockResolvedValue({ id: 'owner', email: 'owner@example.com', emailVerified: true, role: 'CLIENT' });
    database.user.findFirst.mockResolvedValue(null);
    database.user.update.mockResolvedValue({ id: 'owner', role: 'SUPER_ADMIN' });
    expect(await service.bootstrapSuperAdmin('owner')).toMatchObject({ role: 'SUPER_ADMIN' });
  });
  it('does not bootstrap another administrator once one exists', async () => {
    database.user.findUnique.mockResolvedValue({ id: 'owner', email: 'owner@example.com', emailVerified: true, role: 'CLIENT' });
    database.user.findFirst.mockResolvedValue({ id: 'existing' });
    await service.bootstrapSuperAdmin('owner');
    expect(database.user.update).not.toHaveBeenCalled();
  });
  it('delivers a resent code by email without exposing it in the response', async () => {
    const send = jest.fn().mockResolvedValue({});
    const auth = new AuthService(
      { findByEmail: jest.fn().mockResolvedValue({ id: 'owner', email: 'owner@example.com' }), getEmailVerificationStatus: jest.fn().mockResolvedValue({ emailVerified: false }) } as never,
      { resendCode: jest.fn().mockResolvedValue({ code: '123456' }) } as never,
      { sendVerificationEmail: send } as never,
      new JwtService({ secret }),
    );
    const result = await auth.resendVerificationCode('owner@example.com');
    expect(send).toHaveBeenCalledWith('owner@example.com', '123456');
    expect(result).not.toHaveProperty('code');
  });
});
