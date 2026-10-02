import { RoomPositionType } from "@prisma/client";
import { IsEnum, IsInt, IsNotEmpty, IsString, Matches, Min } from "class-validator";

export class RoomPositionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]+$/, {
    message: 'La fila debe contener únicamente letras mayúsculas',
  })
  row!: string;

  @IsInt()
  @Min(1, { message: 'El número de columna debe ser mayor o igual a 1' })
  column!: number;

  @IsEnum(RoomPositionType, {
    message: 'El tipo de posición debe ser sea SEAT o AISLE',
  })
  type!: RoomPositionType;
}