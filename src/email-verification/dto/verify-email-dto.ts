import { IsEmail, IsNotEmpty, Length, MaxLength } from 'class-validator';

export class VerifyEmailDto {
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

  @Length(6, 6)
  code!: string;
}
