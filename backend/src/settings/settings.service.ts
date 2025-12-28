import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WelcomeBannerSettings {
    title: string;
    subtitle: string;
    backgroundImage?: string;
    buttonText: string;
    buttonLink: string;
}

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async getWelcomeBanner(): Promise<WelcomeBannerSettings> {
        const settings = await this.prisma.appSettings.findUnique({
            where: { key: 'welcome_banner' },
        });

        // Return defaults if not set
        if (!settings) {
            return {
                title: 'Welcome to Enqoy!',
                subtitle: 'Discover curated dining experiences with interesting people',
                buttonText: 'Explore Events',
                buttonLink: '/events',
            };
        }

        return {
            title: settings.title || 'Welcome to Enqoy!',
            subtitle: settings.subtitle || 'Discover curated dining experiences with interesting people',
            backgroundImage: settings.backgroundImage || undefined,
            buttonText: settings.buttonText || 'Explore Events',
            buttonLink: settings.buttonLink || '/events',
        };
    }

    async updateWelcomeBanner(data: Partial<WelcomeBannerSettings>) {
        const existing = await this.prisma.appSettings.findUnique({
            where: { key: 'welcome_banner' },
        });

        if (existing) {
            return this.prisma.appSettings.update({
                where: { key: 'welcome_banner' },
                data: {
                    title: data.title,
                    subtitle: data.subtitle,
                    backgroundImage: data.backgroundImage,
                    buttonText: data.buttonText,
                    buttonLink: data.buttonLink,
                },
            });
        }

        return this.prisma.appSettings.create({
            data: {
                key: 'welcome_banner',
                title: data.title,
                subtitle: data.subtitle,
                backgroundImage: data.backgroundImage,
                buttonText: data.buttonText,
                buttonLink: data.buttonLink,
            },
        });
    }
}
