import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, {
    message: 'El título no puede tener más de 100 caracteres',
  })
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, {
    message: 'La descripción no puede tener más de 1000 caracteres',
  })
  description!: string;

  @IsNumber()
  @Min(1, {
    message: 'La duración debe ser mayor a 1',
  })
  duration!: number;

  @IsNumber()
  @Min(0, {
    message: 'La calificación no puede ser menor a 0',
  })
  @Max(10, {
    message: 'La calificación no puede ser mayor a 10',
  })
  rating!: number;

  @Type(() => Date)
  @IsDate()
  releaseDate!: Date;

  @IsArray()
  @ArrayMinSize(1, {
    message: 'Debe haber al menos un género',
  })
  @IsString({ each: true })
  @MaxLength(25, {
    each: true,
    message: 'Un género no puede tener más de 25 caracteres',
  })
  @MinLength(1, {
    each: true,
    message: 'Un género no puede tener menos de 1 caracter',
  })
  genre!: string[];

  @IsOptional()
  @IsString()
  posterUrl?: string;

  @IsOptional()
  @IsString()
  trailerUrl?: string;

  @IsOptional()
  @IsString()
  cinemaId?: string;
}