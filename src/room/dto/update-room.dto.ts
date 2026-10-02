import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateRoomDto } from './create-room.dto';
export class UpdateRoomDto extends PartialType(OmitType(CreateRoomDto, ['cinemaId'] as const)) {}
