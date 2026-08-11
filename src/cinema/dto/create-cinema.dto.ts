import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateCinemaDto {

  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: "El nombre del cine debe tener como máximo 50 caracteres" })
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: "La dirección del cine debe tener como máximo 50 caracteres" })
  address!: string;
}