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
import { CountriesService } from './countries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { UserRole } from '@prisma/client';

@Controller('countries')
export class CountriesController {
  constructor(private countriesService: CountriesService) {}

  @Get()
  findAll() {
    return this.countriesService.findAll();
  }

  @Get('active')
  findActive() {
    return this.countriesService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.countriesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  create(@Body() dto: CreateCountryDto) {
    return this.countriesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  update(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.countriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  delete(@Param('id') id: string) {
    return this.countriesService.delete(id);
  }
}
