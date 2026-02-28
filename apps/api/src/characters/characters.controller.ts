import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { AssignCharacterAssetDto } from './dto/assign-character-asset.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductionMemberGuard } from '../common/guards/production-member.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/types';

@Controller('productions/:productionId/characters')
@UseGuards(JwtAuthGuard, ProductionMemberGuard, RolesGuard)
export class CharactersController {
    constructor(private readonly charactersService: CharactersService) { }

    @Get()
    listCharacters(@Param('productionId') productionId: string) {
        return this.charactersService.listCharacters(productionId);
    }

    @Get(':characterId')
    getCharacter(
        @Param('productionId') productionId: string,
        @Param('characterId') characterId: string,
    ) {
        return this.charactersService.getCharacter(productionId, characterId);
    }

    @Post()
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    createCharacter(
        @Param('productionId') productionId: string,
        @Body() dto: CreateCharacterDto,
    ) {
        return this.charactersService.createCharacter(productionId, dto);
    }

    @Patch(':characterId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    updateCharacter(
        @Param('productionId') productionId: string,
        @Param('characterId') characterId: string,
        @Body() dto: UpdateCharacterDto,
    ) {
        return this.charactersService.updateCharacter(productionId, characterId, dto);
    }

    @Delete(':characterId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    @HttpCode(HttpStatus.NO_CONTENT)
    deleteCharacter(
        @Param('productionId') productionId: string,
        @Param('characterId') characterId: string,
    ) {
        return this.charactersService.deleteCharacter(productionId, characterId);
    }

    @Post(':characterId/assets')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    assignAsset(
        @Param('productionId') productionId: string,
        @Param('characterId') characterId: string,
        @Body() dto: AssignCharacterAssetDto,
    ) {
        return this.charactersService.assignAsset(productionId, characterId, dto);
    }

    @Delete(':characterId/assets/:assetId')
    @Roles(Role.ART_DIRECTOR, Role.PRODUCTION_DESIGNER)
    @HttpCode(HttpStatus.NO_CONTENT)
    removeAsset(
        @Param('productionId') productionId: string,
        @Param('characterId') characterId: string,
        @Param('assetId') assetId: string,
    ) {
        return this.charactersService.removeAsset(productionId, characterId, assetId);
    }
}
