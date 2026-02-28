import { IsEmail, IsEnum } from 'class-validator';
import { Role } from '../../common/types';

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(Role)
  role!: Role;
}
