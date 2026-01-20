import { Module } from '@nestjs/common';
import { PairingController, UserPairingController } from './pairing.controller';
import { PairingService } from './pairing.service';
import { PairingAlgorithmService } from './pairing-algorithm.service';
import { GeminiPairingService } from './gemini-pairing.service';
import { RestaurantDistributionService } from './restaurant-distribution.service';
import { IcebreakersModule } from '../icebreakers/icebreakers.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [IcebreakersModule, EmailModule],
  controllers: [PairingController, UserPairingController],
  providers: [PairingService, PairingAlgorithmService, GeminiPairingService, RestaurantDistributionService],
  exports: [PairingService, PairingAlgorithmService, GeminiPairingService, RestaurantDistributionService],
})
export class PairingModule {}
