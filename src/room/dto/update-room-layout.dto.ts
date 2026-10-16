import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { RoomPositionDto } from './room-position.dto';

export class UpdateRoomLayoutDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => RoomPositionDto)
  positions!: RoomPositionDto[];
}
