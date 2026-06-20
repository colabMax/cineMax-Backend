  import {
    IsEmail,
    IsNotEmpty,
    IsString,
    Matches,
    MaxLength,
    MinLength,
  } from 'class-validator';

  export class CreateUserDto {
    @IsString()
    @MaxLength(50, {
      message: 'El nombre debe tener un máximo de 50 caracteres',
    })
    @IsNotEmpty({
      message: 'El nombre no puede estar vacío',
    })
    name!: string;



    @IsEmail({}, {
      message: 'El email no tiene un formato válido',
    })
    @IsNotEmpty({
      message: 'El email no puede estar vacío',
    })
    @MaxLength(50, {
      message: 'El email debe tener un máximo de 50 caracteres',
    })
    email!: string;




    @IsString()
    @IsNotEmpty({
      message: 'La contraseña no puede estar vacía',
    })
    
    @MinLength(8, {
      message: 'La contraseña debe tener un mínimo de 8 caracteres',
    })

    @MaxLength(100, {
      message: 'La contraseña debe tener un máximo de 100 caracteres',
    })

    @Matches(/[a-z]/, {
      message: 'La contraseña debe contener al menos una letra minúscula',
    })

    @Matches(/[A-Z]/, {
      message: 'La contraseña debe contener al menos una letra mayúscula',
    })

    @Matches(/\d/, {
      message: 'La contraseña debe contener al menos un número',
    })

    @Matches(/[@$!%*?&]/, {
      message:
        'La contraseña debe contener al menos un carácter especial (@$!%*?&)',
    })
    password!: string;
  }