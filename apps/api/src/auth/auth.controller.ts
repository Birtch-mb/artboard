import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

class RefreshDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Body() body: RefreshDto) {
    // Accept token from body (server-side NextAuth refresh) or httpOnly cookie (browser)
    const refreshToken =
      body.refreshToken ||
      (req.cookies as Record<string, string>)['refresh_token'];

    if (!refreshToken) {
      return { statusCode: 401, message: 'No refresh token', error: 'Unauthorized' };
    }
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token', { path: '/' });
    return { message: 'Logged out' };
  }
}
