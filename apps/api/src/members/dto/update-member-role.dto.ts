import { IsEnum } from 'class-validator';
import { Role } from '../../common/types';

export class UpdateMemberRoleDto {
  @IsEnum(Role)
  role!: Role;
}
