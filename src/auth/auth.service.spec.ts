import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { EmailVerificationService } from 'src/email-verification/email-verification.service';
import { EmailService } from 'src/email/email.service';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const verificationCode = '654321';
  const userService = {
    findByEmail: jest.fn(),
    getEmailVerificationStatus: jest.fn(),
  };
  const emailVerificationService = {
    resendCode: jest.fn(),
  };
  const emailService = {
    sendVerificationEmail: jest.fn(),
  };

  beforeEach(async () => {
    userService.findByEmail.mockReset().mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
    });
    userService.getEmailVerificationStatus
      .mockReset()
      .mockResolvedValue({ emailVerified: false });
    emailVerificationService.resendCode.mockReset().mockResolvedValue({
      code: verificationCode,
      expiresAt: new Date(),
    });
    emailService.sendVerificationEmail.mockReset().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        {
          provide: EmailVerificationService,
          useValue: emailVerificationService,
        },
        { provide: EmailService, useValue: emailService },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('sends the new verification code by email without returning it', async () => {
    const response = await service.resendVerificationCode('user@example.com');

    expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
      'user@example.com',
      verificationCode,
    );
    expect(response).toEqual({
      message: 'Se ha enviado un nuevo código de verificación',
    });
    expect(JSON.stringify(response)).not.toContain(verificationCode);
  });
});
