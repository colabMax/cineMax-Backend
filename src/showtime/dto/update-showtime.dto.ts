import { OmitType, PartialType } from "@nestjs/mapped-types";
import { CreateShowtimeDto } from "./create-showtime.dto";

/** Se puede cambiar horario, sala y versión; la película queda fija. */
export class UpdateShowtimeDto extends PartialType(
  OmitType(CreateShowtimeDto, ['movieId'] as const),
) {}
