import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { IcebreakersService } from './icebreakers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('icebreakers')
export class IcebreakersController {
  constructor(private icebreakersService: IcebreakersService) { }

  @Get('active')
  getActiveQuestions() {
    return this.icebreakersService.getActiveQuestions();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  getAllQuestions() {
    return this.icebreakersService.getAllQuestions();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  createQuestion(@Body() data: { question: string; isActive?: boolean; category?: string }) {
    return this.icebreakersService.createQuestion(data.question, data.isActive, data.category);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  updateQuestion(@Param('id') id: string, @Body() data: any) {
    return this.icebreakersService.updateQuestion(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  deleteQuestion(@Param('id') id: string) {
    return this.icebreakersService.deleteQuestion(id);
  }
}
