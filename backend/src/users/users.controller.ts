import { Controller, Get, Patch, Delete, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) { }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('assessment') assessment?: string,
    @Query('gender') gender?: string,
    @Query('city') city?: string,
    @Query('hasBookings') hasBookings?: string,
  ) {
    return this.usersService.findAllFiltered({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      assessment: assessment as 'all' | 'completed' | 'pending' | undefined,
      gender: gender || undefined,
      city: city || undefined,
      hasBookings: hasBookings as 'all' | 'yes' | 'no' | undefined,
    });
  }

  @Get('me')
  getMyProfile(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }

  @Get('me/category')
  getMyCategory(@CurrentUser() user: any) {
    return this.usersService.getUserCategory(user.id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  updateMyProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Post('migrate-personality-data')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  migrateLegacyPersonalityData() {
    return this.usersService.migrateLegacyPersonalityData();
  }
}
