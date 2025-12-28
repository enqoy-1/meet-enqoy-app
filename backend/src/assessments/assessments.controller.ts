import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/create-question.dto';

@Controller('assessments')
export class AssessmentsController {
  constructor(private assessmentsService: AssessmentsService) { }

  @Get('questions')
  getQuestions() {
    return this.assessmentsService.getQuestions();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyAssessment(@CurrentUser() user: any) {
    return this.assessmentsService.getUserAssessment(user.id);
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  submitAssessment(@CurrentUser() user: any, @Body() data: { answers: any }) {
    return this.assessmentsService.submitAssessment(user.id, data.answers);
  }

  @Patch('answer')
  @UseGuards(JwtAuthGuard)
  updateAnswer(
    @CurrentUser() user: any,
    @Body() data: { questionKey: string; value: any },
  ) {
    return this.assessmentsService.updateAnswer(user.id, data.questionKey, data.value);
  }

  @Get('responses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  getAllResponses() {
    return this.assessmentsService.getAllResponses();
  }

  @Post('questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  createQuestion(@Body() dto: CreateQuestionDto) {
    return this.assessmentsService.createQuestion(dto);
  }

  @Patch('questions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  updateQuestion(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.assessmentsService.updateQuestion(id, dto);
  }

  @Delete('questions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  deleteQuestion(@Param('id') id: string) {
    return this.assessmentsService.deleteQuestion(id);
  }

  @Put('questions/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  reorderQuestions(@Body() items: { id: string; order: number }[]) {
    return this.assessmentsService.reorderQuestions(items);
  }
}
