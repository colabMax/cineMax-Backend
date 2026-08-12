import { IsNotEmpty, IsUUID } from "class-validator";

export class AssignCinemaAdminDto {
  @IsUUID()
  @IsNotEmpty()
  cinemaId!: string;
}