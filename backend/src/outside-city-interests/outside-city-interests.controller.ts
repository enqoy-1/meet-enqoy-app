import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';
import {
  OutsideCityInterestsService,
  CreateOutsideCityInterestDto,
} from './outside-city-interests.service';

@Controller('outside-city-interests')
@UseGuards(JwtAuthGuard)
export class OutsideCityInterestsController {
  constructor(
    private outsideCityInterestsService: OutsideCityInterestsService,
  ) {}

  @Post()
  async create(
    @GetUser() user: User,
    @Body() dto: CreateOutsideCityInterestDto,
  ) {
    return this.outsideCityInterestsService.create(user.id, dto);
  }

  @Get('my')
  async getMy(@GetUser() user: User) {
    return this.outsideCityInterestsService.getByUser(user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async getAll() {
    return this.outsideCityInterestsService.getAll();
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @GetUser() user: User) {
    return this.outsideCityInterestsService.delete(id);
  }
}
