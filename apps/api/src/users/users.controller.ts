import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserMeDto } from './dto/update-user-me.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('me')
    getMe(@CurrentUser() user: JwtPayload) {
        return this.usersService.getMe(user.sub);
    }

    @Patch('me')
    updateMe(
        @CurrentUser() user: JwtPayload,
        @Body() dto: UpdateUserMeDto,
    ) {
        return this.usersService.updateMe(user.sub, dto);
    }
}
