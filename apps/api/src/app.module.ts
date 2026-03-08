import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductionsModule } from './productions/productions.module';
import { MembersModule } from './members/members.module';
import { VisibilityModule } from './visibility/visibility.module';
import { SocketModule } from './socket/socket.module';
import { StorageModule } from './storage/storage.module';
import { LocationsModule } from './locations/locations.module';
import { SetsModule } from './sets/sets.module';
import { AssetsModule } from './assets/assets.module';
import { ScriptsModule } from './scripts/scripts.module';
import { ScenesModule } from './scenes/scenes.module';
import { CharactersModule } from './characters/characters.module';
import { ScheduleModule } from './schedule/schedule.module';
import { GanttModule } from './gantt/gantt.module';
import { ActivityModule } from './activity/activity.module';
import { BudgetModule } from './budget/budget.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductionsModule,
    MembersModule,
    VisibilityModule,
    SocketModule,
    StorageModule,
    LocationsModule,
    SetsModule,
    AssetsModule,
    ScriptsModule,
    ScenesModule,
    CharactersModule,
    ScheduleModule,
    GanttModule,
    ActivityModule,
    BudgetModule,
  ],
})
export class AppModule { }
