import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsUUID } from "class-validator";

export class CreateShowtimeDto {
  @IsUUID()
  @IsNotEmpty()
  movieId!: string;
  @IsUUID()
  @IsNotEmpty()
  roomId!: string;
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  startTime!: Date;
}