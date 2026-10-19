import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { ShowtimeLanguage } from "@prisma/client";

export class BulkShowtimeItemDto {
  @Type(() => Date)
  @IsDate()
  startTime!: Date;

  @IsUUID()
  @IsNotEmpty()
  roomId!: string;

  @IsOptional()
  @IsEnum(ShowtimeLanguage)
  language?: ShowtimeLanguage;
}

/** Varias funciones de una misma película; cada una con su horario, sala y versión. */
export class CreateShowtimeBulkDto {
  @IsUUID()
  @IsNotEmpty()
  movieId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BulkShowtimeItemDto)
  items!: BulkShowtimeItemDto[];

  /** Si es true, las que se superponen se saltean; si es false, el lote entero se rechaza. */
  @IsOptional()
  @IsBoolean()
  skipConflicts?: boolean;
}
