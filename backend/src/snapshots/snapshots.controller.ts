import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SnapshotsService } from './snapshots.service';

@Controller('snapshots')
@UseGuards(JwtAuthGuard)
export class SnapshotsController {
  constructor(private snapshotsService: SnapshotsService) {}

  @Get('event/:eventId')
  async getByEvent(@Param('eventId') eventId: string) {
    return this.snapshotsService.getByEvent(eventId);
  }

  @Post('event/:eventId')
  async create(
    @Param('eventId') eventId: string,
    @Body() body: { snapshotData: any },
  ) {
    return this.snapshotsService.create(eventId, body.snapshotData);
  }
}
