import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
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

  /** Precio propio de esta función; si no se envía, se usa el precio del lote. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  price?: number;
}

/** Varias funciones de una misma película; cada una con su horario, sala y versión. */
export class CreateShowtimeBulkDto {
  @IsUUID()
  @IsNotEmpty()
  movieId!: string;

  /** Precio por defecto de las funciones del lote. */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  price!: number;

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
