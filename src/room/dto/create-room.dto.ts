import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  name!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsOptional()
  @IsUUID()
  cinemaId?: string;
}
