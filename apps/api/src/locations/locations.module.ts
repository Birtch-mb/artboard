import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
    imports: [PrismaModule, StorageModule],
    controllers: [LocationsController],
    providers: [LocationsService],
})
export class LocationsModule { }
