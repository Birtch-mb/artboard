import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserMeDto } from './dto/update-user-me.dto';

const ME_SELECT = {
    id: true,
    email: true,
    name: true,
    isAdmin: true,
    showScriptDeletions: true,
} as const;

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async getMe(userId: string): Promise<any> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: ME_SELECT,
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async updateMe(userId: string, dto: UpdateUserMeDto): Promise<any> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const data: Record<string, unknown> = {};
        if ('showScriptDeletions' in dto) data.showScriptDeletions = dto.showScriptDeletions;

        return this.prisma.user.update({
            where: { id: userId },
            data,
            select: ME_SELECT,
        });
    }
}
