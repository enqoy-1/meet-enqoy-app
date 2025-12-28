import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private emailService: EmailService,
  ) { }

  async register(dto: RegisterDto) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        profile: true,
        roles: true,
        personalityAssessment: true,
      },
    });

    // If user exists, check if it's a legacy user (password starts with "Legacy" or is empty)
    if (existingUser) {
      const isLegacyUser = !existingUser.password || existingUser.password.startsWith('$2b$10$') === false || existingUser.password === '';

      // For legacy imports of existing legacy users, UPDATE the user instead of throwing error
      if (dto.isLegacyImport && isLegacyUser) {
        // Update existing legacy user with new data
        const profileUpdateData: any = {
          firstName: dto.firstName || existingUser.profile?.firstName,
          lastName: dto.lastName || existingUser.profile?.lastName,
          age: dto.age || existingUser.profile?.age,
          phone: dto.phone || existingUser.profile?.phone,
          relationshipStatus: dto.relationshipStatus || existingUser.profile?.relationshipStatus,
          hasChildren: dto.hasChildren ?? existingUser.profile?.hasChildren,
          city: dto.city || existingUser.profile?.city,
        };

        if (dto.gender) {
          profileUpdateData.gender = dto.gender;
        }

        // Build enhanced personality data
        const existingAnswers = (existingUser.personalityAssessment?.answers as any) || {};
        const enhancedPersonality = {
          ...existingAnswers,
          ...(dto.personality || {}),
          diet: dto.diet || existingAnswers.diet,
          spending: dto.spending || existingAnswers.spending,
          restaurantFrequency: dto.restaurantFrequency || existingAnswers.restaurantFrequency,
          country: dto.country || existingAnswers.country,
          funFacts: dto.funFacts || existingAnswers.funFacts,
          mealPreference: dto.mealPreference || existingAnswers.mealPreference,
        };

        const hasPersonality = Object.keys(enhancedPersonality).length > 0;

        const updatedUser = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            profile: {
              update: profileUpdateData,
            },
            ...(hasPersonality && existingUser.personalityAssessment ? {
              personalityAssessment: {
                update: {
                  answers: enhancedPersonality,
                },
              },
            } : hasPersonality ? {
              personalityAssessment: {
                create: {
                  answers: enhancedPersonality,
                  completedAt: new Date(),
                },
              },
            } : {}),
          },
          include: {
            profile: true,
            roles: true,
            personalityAssessment: true,
          },
        });

        return {
          user: this.sanitizeUser(updatedUser),
          token: null,
          message: 'Legacy user updated successfully',
        };
      }

      // For legacy imports of non-legacy users, throw error
      if (dto.isLegacyImport) {
        throw new ConflictException('Email already registered (has password)');
      }

      // For legacy users trying to sign up normally, allow them to set a password
      // SECURITY FIX: Do NOT allows legacy account takeover via Sign Up.
      // Users must use Forgot Password to verify ownership of email.
      if (isLegacyUser || existingUser.password === '') {
        // If they have no password, we redirect them to Forgot Password by throwing a specific error
        // or generic conflict.
        throw new ConflictException('Account exists. Please use "Forgot Password" to set your password.');
      }

      // For regular users, throw conflict error
      throw new ConflictException('Email already registered');
    }

    // For legacy imports, store the special constant directly (not hashed)
    // This allows us to detect legacy users later when they try to login
    const isLegacyNoPassword = dto.isLegacyImport && dto.password === 'LEGACY_NO_PASSWORD';
    const hashedPassword = isLegacyNoPassword
      ? 'LEGACY_NO_PASSWORD'  // Store as-is for legacy users
      : await bcrypt.hash(dto.password, 10);  // Hash for regular users

    // Build user data
    const hasPersonality = dto.personality && Object.keys(dto.personality).length > 0;

    // Build enhanced personality data with additional fields
    const enhancedPersonality = hasPersonality ? {
      ...(dto.personality || {}),
      diet: dto.diet,
      spending: dto.spending,
      restaurantFrequency: dto.restaurantFrequency,
      country: dto.country,
      funFacts: dto.funFacts,
      mealPreference: dto.mealPreference,
    } : (dto.diet || dto.spending || dto.restaurantFrequency || dto.country || dto.funFacts || dto.mealPreference) ? {
      diet: dto.diet,
      spending: dto.spending,
      restaurantFrequency: dto.restaurantFrequency,
      country: dto.country,
      funFacts: dto.funFacts,
      mealPreference: dto.mealPreference,
    } : null;

    const userData: any = {
      email: dto.email,
      password: hashedPassword,
      profile: {
        create: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          gender: dto.gender,
          age: dto.age,
          phone: dto.phone,
          relationshipStatus: dto.relationshipStatus,
          hasChildren: dto.hasChildren,
          city: dto.city,
          assessmentCompleted: hasPersonality || !!enhancedPersonality,
        },
      },
      roles: {
        create: {
          role: 'user',
        },
      },
    };

    // Add personality assessment if provided
    if (enhancedPersonality) {
      userData.personalityAssessment = {
        create: {
          answers: enhancedPersonality,
          completedAt: new Date(),
        },
      };
    }

    // Create user
    const user = await this.prisma.user.create({
      data: userData,
      include: {
        profile: true,
        roles: true,
        personalityAssessment: true,
      },
    });

    // Generate token (skip for legacy imports)
    const token = dto.isLegacyImport ? null : this.generateToken(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async login(dto: LoginDto) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        profile: true,
        roles: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if this is a legacy user (no password or non-bcrypt password)
    const isLegacyUser = !user.password || user.password === '' || !user.password.startsWith('$2b$10$');

    if (isLegacyUser) {
      // Return a specific error for legacy users so frontend can handle it
      throw new UnauthorizedException('LEGACY_USER_NO_PASSWORD');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        roles: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.sanitizeUser(user);
  }

  async googleLogin(req: any) {
    if (!req.user) {
      throw new UnauthorizedException('No user from Google');
    }

    const { email, firstName, lastName } = req.user;

    // Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        roles: true,
      },
    });

    if (!user) {
      // Create new user if doesn't exist
      user = await this.prisma.user.create({
        data: {
          email,
          password: '', // Google users don't have a password
          profile: {
            create: {
              firstName,
              lastName,
            },
          },
          roles: {
            create: {
              role: 'user',
            },
          },
        },
        include: {
          profile: true,
          roles: true,
        },
      });
    }

    // Generate JWT token
    const token = this.generateToken(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  private generateToken(userId: string, email: string): string {
    return this.jwt.sign({
      sub: userId,
      email,
    });
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  async forgotPassword(email: string) {
    // Case insensitive search to ensure we find the user
    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        }
      },
      include: { profile: true },
    });

    if (!user) {
      // Don't reveal user existence
      return { message: 'If account exists, email sent.' };
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save token to DB
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send email
    await this.emailService.sendPasswordResetEmail({
      to: user.email,
      resetToken,
      userName: user.profile?.firstName || 'User',
    });

    return { message: 'Reset email sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    // Find user with valid token
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
      include: { profile: true, roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
      include: {
        profile: true,
        roles: true,
      },
    });

    // Generate login token
    const authToken = this.generateToken(updatedUser.id, updatedUser.email);

    return {
      user: this.sanitizeUser(updatedUser),
      token: authToken,
      message: 'Password reset successfully',
    };
  }
}
