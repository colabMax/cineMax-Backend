import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ResendVerificationCodeDto {
  @IsEmail(
    {},
    {
      message: 'El email no tiene un formato válido',
    },
  )
  @IsNotEmpty({
    message: 'El email no puede estar vacío',
  })
  @MaxLength(50, {
    message: 'El email debe tener un máximo de 50 caracteres',
  })
  email!: string;
}
