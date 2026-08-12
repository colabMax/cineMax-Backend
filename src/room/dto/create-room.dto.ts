import { IsNotEmpty, IsNumber, IsString, MaxLength, Min } from "class-validator";

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(25, { message: 'La sala no puede tener mas de 25 caracteres' })
  name!: string;

  @IsNumber()
  @Min(1, { message: 'La capacidad debe ser mayor a 1' })
  @IsNotEmpty()
  capacity!: number;
}