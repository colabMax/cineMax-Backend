import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDate, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

/** Varias funciones de una misma película en una misma sala. */
export class CreateShowtimeBulkDto {
  @IsUUID()
  @IsNotEmpty()
  movieId!: string;

  @IsUUID()
  @IsNotEmpty()
  roomId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @Type(() => Date)
  @IsDate({ each: true })
  startTimes!: Date[];

  /** Si es true, las que se superponen se saltean; si es false, el lote entero se rechaza. */
  @IsOptional()
  @IsBoolean()
  skipConflicts?: boolean;
}
