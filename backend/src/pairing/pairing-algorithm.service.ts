import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type PersonalityCategory = 'Trailblazers' | 'Storytellers' | 'Philosophers' | 'Planners' | 'Free Spirits';

export interface ParticipantCategory {
  userId: string;
  category: PersonalityCategory;
  scores: {
    Trailblazers: number;
    Storytellers: number;
    Philosophers: number;
    Planners: number;
    'Free Spirits': number;
  };
  age?: number;
  gender?: string;
  budget?: string;
  relationshipStatus?: string;  // single, dating, married, etc.
  hasChildren?: boolean;
  assessmentAnswers: any;
}

export interface Group {
  participants: ParticipantCategory[];
  categoryDistribution: Record<PersonalityCategory, number>;
  genderDistribution: { male: number; female: number; other: number };
  averageAge: number;
  budget: string;
  compatibilityScore: number;
  name?: string;
}

@Injectable()
export class PairingAlgorithmService {
  constructor(private prisma: PrismaService) { }

  /**
   * Categorize a participant based on their assessment answers
   */
  async categorizeParticipant(userId: string): Promise<ParticipantCategory> {
    // Get user's assessment
    const assessment = await this.prisma.personalityAssessment.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new Error(`No assessment found for user ${userId}`);
    }

    const answers = assessment.answers as any;
    const profile = assessment.user.profile;

    // Use shared scoring function with weighting
    const scores = this.scorePersonalityFromAnswers(answers);

    // Determine category (highest score)
    const category = Object.keys(scores).reduce((a, b) =>
      scores[a as PersonalityCategory] > scores[b as PersonalityCategory] ? a : b,
    ) as PersonalityCategory;

    // Get age and budget from profile/answers
    const age = profile?.age || (answers.birthday ? this.calculateAge(answers.birthday) : undefined);
    const budget = this.mapSpendingToBudget(answers.spending);
    const relationshipStatus = profile?.relationshipStatus || answers.relationshipStatus;
    const hasChildren = profile?.hasChildren ?? (answers.hasChildren === 'yes');

    return {
      userId,
      category,
      scores,
      age,
      gender: profile?.gender || answers.gender,
      budget,
      relationshipStatus,
      hasChildren,
      assessmentAnswers: answers,
    };
  }

  /**
   * Shared scoring function with personality weighting
   * Weights: dinnerVibe (3x), talkTopic (2x), groupDynamic (2x), others (1x)
   */
  /**
   * Shared scoring function with personality weighting
   * Weights: dinnerVibe (3x), talkTopic (2x), groupDynamic (2x), others (1x)
   */
  private scorePersonalityFromAnswers(answers: any): Record<PersonalityCategory, number> {
    const scores: Record<PersonalityCategory, number> = {
      Trailblazers: 0,
      Storytellers: 0,
      Philosophers: 0,
      Planners: 0,
      'Free Spirits': 0,
    };

    // talkTopic - 2x weight - handle both full and short format
    const talkTopic = answers.talkTopic;
    if (talkTopic === 'Current events and world issues' || talkTopic === 'current_events') {
      scores.Philosophers += 1;
      scores.Planners += 3; // Boosted from 1 to 3 to help Planners
    } else if (talkTopic === 'Arts, entertainment, and pop culture' || talkTopic === 'arts_entertainment') {
      scores.Storytellers += 2;
      scores['Free Spirits'] += 2;
    } else if (talkTopic === 'Personal growth and philosophy' || talkTopic === 'personal_growth') {
      scores.Philosophers += 3;
    } else if (talkTopic === 'Food, travel, and experiences' || talkTopic === 'food_travel') {
      scores.Trailblazers += 2;
      scores['Free Spirits'] += 2; // Boosted Free Spirits
    } else if (talkTopic === 'Hobbies and niche interests' || talkTopic === 'hobbies') {
      scores.Trailblazers += 2;
      scores.Storytellers += 2;
    }

    // groupDynamic - 2x weight - handle both full and short format
    const groupDynamic = answers.groupDynamic;
    if (groupDynamic === 'A mix of people with shared interests and similar personalities' || groupDynamic === 'similar') {
      scores.Storytellers += 2;
      scores.Planners += 2;
      scores.Philosophers += 2;
    } else if (groupDynamic === 'A diverse group with different viewpoints and experiences' || groupDynamic === 'diverse') {
      scores.Trailblazers += 2;
      scores['Free Spirits'] += 2;
    }

    // dinnerVibe - 3x weight (most important)
    const dinnerVibe = answers.dinnerVibe;
    if (dinnerVibe === 'steering') {
      scores.Storytellers += 6;  // 2 * 3
      scores.Trailblazers += 3;
    } else if (dinnerVibe === 'sharing') {
      scores.Storytellers += 3;
    } else if (dinnerVibe === 'observing') {
      scores.Philosophers += 4;
      scores.Planners += 4;      // Boosted from 1 to 4 (major boost to verify Planner viability)
    } else if (dinnerVibe === 'adapting') {
      scores['Free Spirits'] += 6;  // 2 * 3 (Strong Free Spirit signal)
    }

    // humorType - 1x weight - handle both full and short format
    const humorType = answers.humorType;
    if (humorType === 'sarcastic') {
      scores.Storytellers += 1;
    } else if (humorType === 'playful' || humorType === 'lighthearted') {
      scores.Storytellers += 1;
      scores['Free Spirits'] += 1;
      scores.Trailblazers += 1;
    } else if (humorType === 'witty' || humorType === 'clever' || humorType === 'dry') {
      scores.Philosophers += 1;
      scores.Storytellers += 1;
    } else if (humorType === 'not_a_fan' || humorType === 'none') {
      scores.Philosophers += 1;
      scores.Planners += 1;
    }

    // wardrobeStyle - 1x weight - handle both full and short format
    const wardrobeStyle = answers.wardrobeStyle;
    if (wardrobeStyle === 'timeless' || wardrobeStyle === 'classics') {
      scores.Planners += 4;      // Boosted from 1 to 4 (Winning trait for Planners)
      scores.Philosophers += 1;
    } else if (wardrobeStyle === 'bold' || wardrobeStyle === 'trendy' || wardrobeStyle === 'statement') {
      scores.Trailblazers += 3;
      scores.Storytellers += 1;
      scores['Free Spirits'] += 1;
    }

    // Scale questions (1-5) - 1x weight
    const introvertScale = answers.introvertScale;
    if (introvertScale === 1 || introvertScale === 2) {
      scores.Trailblazers += 1;
      scores.Storytellers += 1;
    } else if (introvertScale === 4 || introvertScale === 5) {
      scores.Philosophers += 2;
      scores.Planners += 2; // Equal weight for introversion
    } else if (introvertScale === 3) {
      scores['Free Spirits'] += 1;
    }

    const aloneTimeScale = answers.aloneTimeScale;
    if (aloneTimeScale === 1 || aloneTimeScale === 2) {
      scores.Storytellers += 1;
      scores.Trailblazers += 1;
    } else if (aloneTimeScale === 4 || aloneTimeScale === 5) {
      scores.Philosophers += 1;
      scores.Planners += 1;
    } else if (aloneTimeScale === 3) {
      scores['Free Spirits'] += 1;
    }

    const familyScale = answers.familyScale;
    if (familyScale === 1 || familyScale === 2) {
      scores['Free Spirits'] += 1;
    } else if (familyScale === 4 || familyScale === 5) {
      scores.Philosophers += 1;
      scores.Planners += 1;
    } else if (familyScale === 3) {
      scores.Trailblazers += 1;
    }

    const spiritualityScale = answers.spiritualityScale;
    if (spiritualityScale === 1 || spiritualityScale === 2) {
      scores.Trailblazers += 1;
      scores.Storytellers += 1;
    } else if (spiritualityScale === 4 || spiritualityScale === 5) {
      scores.Philosophers += 2;
    } else if (spiritualityScale === 3) {
      scores['Free Spirits'] += 1;
    }

    const humorScale = answers.humorScale;
    if (humorScale === 1 || humorScale === 2) {
      scores.Philosophers += 1;
    } else if (humorScale === 4 || humorScale === 5) {
      scores.Storytellers += 1;
      scores['Free Spirits'] += 1;
    } else if (humorScale === 3) {
      scores.Trailblazers += 1;
    }

    // meetingPriority - 1x weight - handle both full and short format
    const meetingPriority = answers.meetingPriority;
    if (meetingPriority === 'Shared values and interests' || meetingPriority === 'values' || meetingPriority === 'friendship') {
      scores.Philosophers += 1;
      scores.Planners += 1;
    } else if (meetingPriority === 'Fun and engaging conversations' || meetingPriority === 'fun') {
      scores.Storytellers += 1;
      scores.Trailblazers += 1;
    } else if (meetingPriority === 'Learning something new from others' || meetingPriority === 'learning') {
      scores.Philosophers += 1;
      scores.Trailblazers += 1;
    } else if (meetingPriority === 'Feeling a sense of connection' || meetingPriority === 'connection') {
      scores['Free Spirits'] += 2;
    }

    return scores;
  }

  /**
   * Get best pairing categories for a given category
   */
  getBestPairings(category: PersonalityCategory): PersonalityCategory[] {
    const pairingMap: Record<PersonalityCategory, PersonalityCategory[]> = {
      Trailblazers: ['Free Spirits', 'Storytellers'],
      Storytellers: ['Philosophers', 'Trailblazers'],
      Philosophers: ['Planners', 'Storytellers'],
      Planners: ['Philosophers', 'Free Spirits'],
      'Free Spirits': ['Trailblazers', 'Planners'],
    };
    return pairingMap[category] || [];
  }

  /**
   * Check if two participants are compatible based on age (max 5 years difference)
   */
  isAgeCompatible(participant1: ParticipantCategory, participant2: ParticipantCategory): boolean {
    if (!participant1.age || !participant2.age) return true; // Allow if age not available
    return Math.abs(participant1.age - participant2.age) <= 5;
  }

  /**
   * Check if two participants have matching budget
   */
  isBudgetCompatible(participant1: ParticipantCategory, participant2: ParticipantCategory): boolean {
    if (!participant1.budget || !participant2.budget) return true; // Allow if budget not available
    return participant1.budget === participant2.budget;
  }

  /**
   * Check if two participants are compatible based on relationship status
   * Singles prefer singles, committed people prefer committed
   */
  isRelationshipCompatible(participant1: ParticipantCategory, participant2: ParticipantCategory): boolean {
    if (!participant1.relationshipStatus || !participant2.relationshipStatus) return true;
    const singleStatuses = ['single'];
    const committedStatuses = ['married', 'in_relationship', 'dating', 'engaged'];
    const p1IsSingle = singleStatuses.includes(participant1.relationshipStatus.toLowerCase());
    const p2IsSingle = singleStatuses.includes(participant2.relationshipStatus.toLowerCase());
    return p1IsSingle === p2IsSingle;
  }

  /**
   * Check if adding participants can still achieve gender balance when group is full
   * This prevents creating impossible situations while building groups
   */
  private canMaintainGenderBalance(currentGroup: ParticipantCategory[], targetSize: number): boolean {
    const genderCounts = { male: 0, female: 0, other: 0 };

    currentGroup.forEach((p) => {
      const gender = p.gender?.toLowerCase();
      if (gender === 'male') genderCounts.male++;
      else if (gender === 'female') genderCounts.female++;
      else genderCounts.other++;
    });

    const currentSize = currentGroup.length;
    const remainingSlots = targetSize - currentSize;
    const male = genderCounts.male;
    const female = genderCounts.female;

    // Calculate max allowed difference for this target size
    let maxAllowedDifference = 1;
    if (targetSize === 4) maxAllowedDifference = 0;
    else if (targetSize === 6 || targetSize === 8) maxAllowedDifference = 2;

    // Check if current imbalance can still be fixed with remaining slots
    const currentDifference = Math.abs(male - female);

    // If we're already beyond the max difference and can't fix it
    if (currentDifference > maxAllowedDifference + remainingSlots) {
      return false;
    }

    // If either gender is 0 and we can't add enough to balance
    if (male === 0 && remainingSlots === 0) return false;
    if (female === 0 && remainingSlots === 0) return false;

    return true;
  }

  /**
   * Check if a group has valid gender balance
   */
  isValidGenderBalance(group: ParticipantCategory[]): boolean {
    const genderCounts = {
      male: 0,
      female: 0,
      other: 0,
    };

    group.forEach((p) => {
      const gender = p.gender?.toLowerCase();
      if (gender === 'male') genderCounts.male++;
      else if (gender === 'female') genderCounts.female++;
      else genderCounts.other++;
    });

    const total = group.length;
    const male = genderCounts.male;
    const female = genderCounts.female;

    // STRICT GENDER BALANCE ENFORCEMENT
    // Rule: Both genders MUST be represented, and difference can't exceed 2

    // First check: Both genders must be present (no all-male or all-female groups)
    if (male === 0 || female === 0) {
      console.log(`❌ Gender balance FAILED: ${male}M, ${female}F - one gender missing`);
      return false;
    }

    // Calculate the difference
    const difference = Math.abs(male - female);

    // Strict balance rules based on group size
    let maxAllowedDifference = 1; // Default: difference of 1 is OK

    if (total === 4) {
      maxAllowedDifference = 0; // 2-2 ONLY
    } else if (total === 5) {
      maxAllowedDifference = 1; // 2-3 or 3-2
    } else if (total === 6) {
      maxAllowedDifference = 2; // 3-3 preferred, 4-2 acceptable, 5-1 NOT OK
    } else if (total === 7) {
      maxAllowedDifference = 1; // 3-4 or 4-3 ONLY, 5-2 NOT OK
    } else if (total === 8) {
      maxAllowedDifference = 2; // 4-4 preferred, 5-3 acceptable, 6-2 NOT OK
    } else if (total === 9) {
      maxAllowedDifference = 1; // 4-5 or 5-4 ONLY, 6-3 NOT OK
    }

    const isBalanced = difference <= maxAllowedDifference;

    if (!isBalanced) {
      console.log(`❌ Gender balance FAILED: ${male}M, ${female}F (diff: ${difference}, max allowed: ${maxAllowedDifference})`);
    } else {
      console.log(`✅ Gender balance OK: ${male}M, ${female}F (diff: ${difference})`);
    }

    return isBalanced;
  }

  /**
   * Calculate compatibility score for a group
   */
  calculateGroupCompatibility(group: ParticipantCategory[]): number {
    let score = 0;
    const bestPairings = new Map<PersonalityCategory, PersonalityCategory[]>();

    // Build pairing map
    group.forEach((p) => {
      bestPairings.set(p.category, this.getBestPairings(p.category));
    });

    // Check pairwise compatibility
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const p1 = group[i];
        const p2 = group[j];

        // Category compatibility
        const p1BestPairs = bestPairings.get(p1.category) || [];
        if (p1BestPairs.includes(p2.category)) {
          score += 10;
        }

        // Age compatibility
        if (this.isAgeCompatible(p1, p2)) {
          score += 5;
        } else {
          score -= 10; // Penalty for age mismatch
        }

        // Budget compatibility
        if (this.isBudgetCompatible(p1, p2)) {
          score += 5;
        } else {
          score -= 5; // Penalty for budget mismatch
        }
      }
    }

    return score;
  }

  /**
   * Generate optimal groups for an event
   * New logic:
   * - Less than 4 participants: return empty (event should be postponed)
   * - 4-9 participants: ONE group (no splitting)
   * - 10+ participants: Split into groups of 5-6 (optimal size)
   * 
   * Constraints (in order, relaxed if needed):
   * 1. Avoid pairs (never relax)
   * 2. Budget compatibility (strict then lenient)
   * 3. Age compatibility (5 year max)
   * 4. Relationship status
   * 5. Gender balance (preferred, not enforced)
   */
  async generateGroups(eventId: string, targetGroupSize: number = 6): Promise<Group[]> {
    // Fetch avoid constraints first
    const avoidConstraints = await this.prisma.pairingConstraint.findMany({
      where: { type: 'avoid_pair' },
    });
    console.log(`Found ${avoidConstraints.length} avoid constraints`);

    // Get participants from PairingGuest records
    const pairingGuests = await this.prisma.pairingGuest.findMany({
      where: { eventId },
    });
    console.log(`Found ${pairingGuests.length} pairing guests for event ${eventId}`);

    // Categorize from pairing guests
    const participants: ParticipantCategory[] = [];

    for (const guest of pairingGuests) {
      if (guest.personality) {
        try {
          const answers = guest.personality as any;
          const categorized = this.categorizeFromAnswers(
            guest.id,
            answers,
            guest.age,
            guest.gender,
          );
          participants.push(categorized);
          console.log(`Categorized guest ${guest.name}: ${categorized.category}`);
        } catch (error) {
          console.error(`Failed to categorize guest ${guest.id}:`, error);
          participants.push(this.createDefaultParticipant(guest.id, guest.age, guest.gender));
        }
      } else {
        console.log(`Guest ${guest.name} has no personality data, using default`);
        participants.push(this.createDefaultParticipant(guest.id, guest.age, guest.gender));
      }
    }

    // Fallback to bookings if no pairing guests found
    if (participants.length === 0) {
      console.log('No pairing guests found, falling back to bookings');
      const bookings = await this.prisma.booking.findMany({
        where: {
          eventId,
          status: 'confirmed',
        },
        include: {
          user: {
            include: {
              profile: true,
              personalityAssessment: true,
            },
          },
        },
      });

      for (const booking of bookings) {
        if (booking.user.personalityAssessment) {
          try {
            const categorized = await this.categorizeParticipant(booking.userId);
            participants.push(categorized);
          } catch (error) {
            console.error(`Failed to categorize user ${booking.userId}:`, error);
            participants.push(this.createDefaultParticipant(
              booking.userId,
              booking.user.profile?.age,
              booking.user.profile?.gender,
            ));
          }
        } else {
          participants.push(this.createDefaultParticipant(
            booking.userId,
            booking.user.profile?.age,
            booking.user.profile?.gender,
          ));
        }
      }
    }

    console.log(`Total ${participants.length} participants ready for grouping`);

    // NOT ENOUGH: Less than 4 participants
    if (participants.length < 4) {
      console.log(`Not enough participants (${participants.length}) - minimum is 4. Event should be postponed.`);
      return [];
    }

    // SINGLE GROUP: 4-9 participants - no splitting
    if (participants.length <= 9) {
      console.log(`${participants.length} participants (4-9 range): Creating single group`);
      const group = this.createGroup(participants);
      return [group];
    }

    // SPLIT: 10+ participants - split into groups based on targetGroupSize
    console.log(`${participants.length} participants (10+): Splitting into groups of ${targetGroupSize}`);

    // Calculate optimal number of groups based on target size
    const numGroups = Math.ceil(participants.length / targetGroupSize);
    const baseGroupSize = Math.floor(participants.length / numGroups);
    const extraPeople = participants.length % numGroups;

    console.log(`Creating ${numGroups} groups, base size ${baseGroupSize}, ${extraPeople} groups get +1`);

    // Try STRICT grouping first (respects all constraints including budget/age/relationship)
    const strictGroups = this.generateStrictGroupsWithAvoidConstraints(
      participants,
      numGroups,
      baseGroupSize,
      extraPeople,
      avoidConstraints
    );

    if (strictGroups.length > 0) {
      console.log(`STRICT mode succeeded! Generated ${strictGroups.length} groups`);
      return strictGroups;
    }

    // Fall back to LENIENT grouping (only respects avoid constraints)
    console.log('STRICT mode failed, falling back to LENIENT grouping...');
    const lenientGroups = this.generateLenientGroupsWithAvoidConstraints(
      participants,
      numGroups,
      baseGroupSize,
      extraPeople,
      avoidConstraints
    );
    console.log(`LENIENT mode generated ${lenientGroups.length} groups`);

    return lenientGroups;
  }

  /**
   * Generate groups respecting all constraints (strict mode)
   */
  private generateStrictGroupsWithAvoidConstraints(
    participants: ParticipantCategory[],
    numGroups: number,
    baseGroupSize: number,
    extraPeople: number,
    avoidConstraints: any[],
  ): Group[] {
    const groups: Group[] = [];
    const used = new Set<string>();
    const remaining = [...participants];

    for (let g = 0; g < numGroups; g++) {
      const targetSize = baseGroupSize + (g < extraPeople ? 1 : 0);
      const groupParticipants: ParticipantCategory[] = [];

      // Find seed participant
      const seed = remaining.find(p => !used.has(p.userId));
      if (!seed) break;

      groupParticipants.push(seed);
      used.add(seed.userId);

      // Build group with constraints
      while (groupParticipants.length < targetSize) {
        let bestCandidate: ParticipantCategory | null = null;
        let bestScore = -Infinity;

        for (const candidate of remaining) {
          if (used.has(candidate.userId)) continue;

          // Check avoid constraints (NEVER relax)
          if (this.hasAvoidConstraint(groupParticipants, candidate, avoidConstraints)) continue;

          // Check compatibility with all group members
          let compatible = true;
          for (const member of groupParticipants) {
            if (!this.isAgeCompatible(member, candidate)) { compatible = false; break; }
            if (!this.isBudgetCompatible(member, candidate)) { compatible = false; break; }
            if (!this.isRelationshipCompatible(member, candidate)) { compatible = false; break; }
          }
          if (!compatible) continue;

          // Calculate score
          const score = this.calculateCandidateScore(groupParticipants, candidate);
          if (score > bestScore) {
            bestScore = score;
            bestCandidate = candidate;
          }
        }

        if (bestCandidate) {
          groupParticipants.push(bestCandidate);
          used.add(bestCandidate.userId);
        } else {
          // Can't find compatible candidate - strict mode failed
          return [];
        }
      }

      // Remove used participants from remaining
      for (const p of groupParticipants) {
        const idx = remaining.findIndex(r => r.userId === p.userId);
        if (idx !== -1) remaining.splice(idx, 1);
      }

      groups.push(this.createGroup(groupParticipants));
    }

    return groups;
  }

  /**
   * Generate groups with only avoid constraints (lenient mode)
   * Other constraints are relaxed but we still try to optimize placement
   */
  private generateLenientGroupsWithAvoidConstraints(
    participants: ParticipantCategory[],
    numGroups: number,
    baseGroupSize: number,
    extraPeople: number,
    avoidConstraints: any[],
  ): Group[] {
    const groups: ParticipantCategory[][] = Array.from({ length: numGroups }, () => []);
    const remaining = [...participants];

    // Shuffle for random distribution
    remaining.sort(() => Math.random() - 0.5);

    // Distribute participants across groups
    for (const participant of remaining) {
      // Find best group for this participant
      let bestGroupIdx = 0;
      let minSize = Infinity;

      for (let g = 0; g < numGroups; g++) {
        const targetSize = baseGroupSize + (g < extraPeople ? 1 : 0);

        // Skip if group is full
        if (groups[g].length >= targetSize) continue;

        // Check avoid constraints
        if (this.hasAvoidConstraint(groups[g], participant, avoidConstraints)) continue;

        // Check gender balance - CRITICAL: Even in lenient mode, enforce gender balance
        const testGroup = [...groups[g], participant];

        // Check if adding this participant would make gender balance impossible
        if (!this.canMaintainGenderBalance(testGroup, targetSize)) {
          console.log(`⚠️ Skipping group ${g} - adding ${participant.gender} would make balance impossible`);
          continue;
        }

        // If group is full, do final validation
        if (testGroup.length >= targetSize && !this.isValidGenderBalance(testGroup)) {
          console.log(`⚠️ Skipping group ${g} - final check failed for gender balance`);
          continue;
        }

        // Prefer smaller groups
        if (groups[g].length < minSize) {
          minSize = groups[g].length;
          bestGroupIdx = g;
        }
      }

      // If no valid group found, try to force into any group (last resort)
      if (minSize === Infinity) {
        console.warn(`⚠️ No valid group for participant ${participant.userId}, forcing into smallest group`);
        bestGroupIdx = groups.reduce((minIdx, g, idx) =>
          g.length < groups[minIdx].length ? idx : minIdx, 0
        );
      }

      groups[bestGroupIdx].push(participant);
    }

    return groups.filter(g => g.length > 0).map(g => this.createGroup(g));
  }

  /**
   * Check if adding a participant would violate avoid constraints
   */
  private hasAvoidConstraint(
    group: ParticipantCategory[],
    candidate: ParticipantCategory,
    avoidConstraints: any[],
  ): boolean {
    for (const constraint of avoidConstraints) {
      for (const member of group) {
        if (
          (constraint.guest1Id === candidate.userId && constraint.guest2Id === member.userId) ||
          (constraint.guest2Id === candidate.userId && constraint.guest1Id === member.userId)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Create a default participant when no personality data available
   */
  private createDefaultParticipant(
    id: string,
    age?: number | null,
    gender?: string | null,
  ): ParticipantCategory {
    return {
      userId: id,
      category: 'Free Spirits',
      scores: { Trailblazers: 0, Storytellers: 0, Philosophers: 0, Planners: 0, 'Free Spirits': 1 },
      age: age || undefined,
      gender: gender || undefined,
      budget: undefined,
      assessmentAnswers: {},
    };
  }

  /**
   * Generate groups with strict constraints (age, budget, gender balance)
   */
  private generateStrictGroups(
    participants: ParticipantCategory[],
    targetGroupSize: number,
  ): Group[] {
    const groups: Group[] = [];
    const used = new Set<string>();
    const remaining = [...participants];

    while (remaining.length >= targetGroupSize) {
      const group = this.findOptimalGroup(remaining, targetGroupSize, used);
      if (group.length === targetGroupSize) {
        groups.push(this.createGroup(group));
        group.forEach((p) => {
          used.add(p.userId);
          const index = remaining.findIndex((r) => r.userId === p.userId);
          if (index !== -1) remaining.splice(index, 1);
        });
      } else {
        break; // Can't form more groups with strict constraints
      }
    }

    return groups;
  }

  /**
   * Generate groups with lenient constraints (just divide into groups)
   */
  private generateLenientGroups(
    participants: ParticipantCategory[],
    targetGroupSize: number,
  ): Group[] {
    // Sort by category for some diversity
    participants.sort((a, b) => a.category.localeCompare(b.category));

    const groups: Group[] = [];
    let i = 0;

    // Use minimum of targetGroupSize or available participants
    const actualGroupSize = Math.min(targetGroupSize, participants.length);

    while (i + actualGroupSize <= participants.length) {
      const groupParticipants = participants.slice(i, i + actualGroupSize);
      const group = this.createGroup(groupParticipants);
      groups.push(group);
      console.log(`Created group ${groups.length} with ${groupParticipants.length} participants`);
      i += actualGroupSize;
    }

    // Handle remaining participants
    if (i < participants.length && groups.length > 0) {
      const remaining = participants.slice(i);
      if (remaining.length >= 4) {
        // Create smaller group (minimum size 4)
        const group = this.createGroup(remaining);
        groups.push(group);
        console.log(`Created final group with ${remaining.length} remaining participants`);
      } else {
        // Add to last group if less than 4 remaining
        groups[groups.length - 1] = this.createGroup([
          ...groups[groups.length - 1].participants,
          ...remaining,
        ]);
        console.log(`Added ${remaining.length} remaining to last group`);
      }
    } else if (i < participants.length && groups.length === 0 && participants.length >= 4) {
      // Edge case: fewer than targetGroupSize but at least 4
      const group = this.createGroup(participants);
      groups.push(group);
      console.log(`Created single group with all ${participants.length} participants`);
    }

    return groups;
  }

  /**
   * Categorize a participant from stored answers (without needing database lookup)
   * Uses shared scoring function
   */
  private categorizeFromAnswers(
    guestId: string,
    answers: any,
    age?: number | null,
    gender?: string | null,
  ): ParticipantCategory {
    // Use shared scoring function
    const scores = this.scorePersonalityFromAnswers(answers);

    // Determine category (highest score)
    const category = Object.keys(scores).reduce((a, b) =>
      scores[a as PersonalityCategory] > scores[b as PersonalityCategory] ? a : b,
    ) as PersonalityCategory;

    const budget = this.mapSpendingToBudget(answers.spending);
    const relationshipStatus = answers.relationshipStatus;
    const hasChildren = answers.hasChildren === 'yes';

    return {
      userId: guestId,
      category,
      scores,
      age: age || undefined,
      gender: gender || undefined,
      budget,
      relationshipStatus,
      hasChildren,
      assessmentAnswers: answers,
    };
  }

  /**
   * Find optimal group from remaining participants
   */
  private findOptimalGroup(
    participants: ParticipantCategory[],
    targetSize: number,
    used: Set<string>,
  ): ParticipantCategory[] {
    const available = participants.filter((p) => !used.has(p.userId));
    if (available.length < targetSize) return [];

    // Try multiple combinations to find the best one
    let bestGroup: ParticipantCategory[] = [];
    let bestScore = -Infinity;

    // Use a greedy approach: start with a seed participant and build around them
    for (const seed of available) {
      const group = [seed];
      const candidates = available.filter((p) => p.userId !== seed.userId);

      // Build group iteratively
      while (group.length < targetSize && candidates.length > 0) {
        let bestCandidate: ParticipantCategory | null = null;
        let bestCandidateScore = -Infinity;

        for (const candidate of candidates) {
          // Check if adding this candidate maintains constraints
          const testGroup = [...group, candidate];

          // Check age compatibility with all existing members
          const ageCompatible = group.every((p) => this.isAgeCompatible(p, candidate));
          if (!ageCompatible) continue;

          // Check budget compatibility
          const budgetCompatible = group.every((p) => this.isBudgetCompatible(p, candidate));
          if (!budgetCompatible) continue;

          // Calculate score for adding this candidate
          const score = this.calculateCandidateScore(group, candidate);
          if (score > bestCandidateScore) {
            bestCandidateScore = score;
            bestCandidate = candidate;
          }
        }

        if (bestCandidate) {
          group.push(bestCandidate);
          const index = candidates.findIndex((c) => c.userId === bestCandidate!.userId);
          if (index !== -1) candidates.splice(index, 1);
        } else {
          break; // Can't find compatible candidate
        }
      }

      // Check if group is valid and calculate score
      if (group.length === targetSize && this.isValidGenderBalance(group)) {
        const score = this.calculateGroupCompatibility(group);
        if (score > bestScore) {
          bestScore = score;
          bestGroup = group;
        }
      }
    }

    return bestGroup;
  }

  /**
   * Calculate score for adding a candidate to a group
   */
  private calculateCandidateScore(group: ParticipantCategory[], candidate: ParticipantCategory): number {
    let score = 0;
    const bestPairings = this.getBestPairings(candidate.category);

    group.forEach((member) => {
      // Category compatibility
      if (bestPairings.includes(member.category)) {
        score += 10;
      }

      // Age compatibility
      if (this.isAgeCompatible(member, candidate)) {
        score += 5;
      }

      // Budget compatibility
      if (this.isBudgetCompatible(member, candidate)) {
        score += 5;
      }
    });

    return score;
  }

  /**
   * Create a Group object from participants
   */
  createGroup(participants: ParticipantCategory[], name?: string): Group {
    const categoryDistribution: Record<PersonalityCategory, number> = {
      Trailblazers: 0,
      Storytellers: 0,
      Philosophers: 0,
      Planners: 0,
      'Free Spirits': 0,
    };

    const genderDistribution = { male: 0, female: 0, other: 0 };
    let totalAge = 0;
    let ageCount = 0;
    const budgets: string[] = [];

    participants.forEach((p) => {
      categoryDistribution[p.category]++;
      const gender = p.gender?.toLowerCase();
      if (gender === 'male') genderDistribution.male++;
      else if (gender === 'female') genderDistribution.female++;
      else genderDistribution.other++;

      if (p.age) {
        totalAge += p.age;
        ageCount++;
      }
      if (p.budget) budgets.push(p.budget);
    });

    // Most common budget
    const budgetCounts = budgets.reduce((acc, b) => {
      acc[b] = (acc[b] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const budget = Object.keys(budgetCounts).reduce((a, b) =>
      budgetCounts[a] > budgetCounts[b] ? a : b,
    ) || 'unknown';

    return {
      participants,
      categoryDistribution,
      genderDistribution,
      averageAge: ageCount > 0 ? Math.round(totalAge / ageCount) : 0,
      budget,
      compatibilityScore: this.calculateGroupCompatibility(participants),
      name,
    };
  }

  /**
   * Helper: Calculate age from birthday
   */
  private calculateAge(birthday: string): number {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Helper: Map spending answer to budget category
   * Handles both string format ("500-1000") and numeric format (750)
   */
  private mapSpendingToBudget(spending: string | number): string | undefined {
    if (!spending) return undefined;

    // Handle numeric spending values
    if (typeof spending === 'number') {
      if (spending < 500) return '<500';
      if (spending >= 500 && spending < 1000) return '500-1000';
      if (spending >= 1000 && spending < 1500) return '1000-1500';
      if (spending >= 1500) return '1500+';
    }

    // Handle string spending values
    const spendingStr = String(spending);

    // Handle exact values from the form
    if (spendingStr === '500-1000' || spendingStr.includes('500-1000')) {
      return '500-1000';
    } else if (spendingStr === '1000-1500' || spendingStr.includes('1000-1500')) {
      return '1000-1500';
    } else if (spendingStr === '1500+' || spendingStr.includes('1500+') || spendingStr.includes('more than 1500')) {
      return '1500+';
    } else if (spendingStr.includes('less than 500') || spendingStr.includes('< 500') || spendingStr === '<500') {
      return '<500';
    }

    // Fallback: try to extract number from string
    const spendingLower = spendingStr.toLowerCase();
    if (spendingLower.includes('500') && spendingLower.includes('1000')) {
      return '500-1000';
    } else if (spendingLower.includes('1000') && spendingLower.includes('1500')) {
      return '1000-1500';
    } else if (spendingLower.includes('1500') || spendingLower.includes('more')) {
      return '1500+';
    }

    return spendingStr; // Return as-is if can't map
  }
}

