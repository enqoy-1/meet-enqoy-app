import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { PairingAlgorithmService, ParticipantCategory, Group, PersonalityCategory } from './pairing-algorithm.service';

@Injectable()
export class GeminiPairingService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(
    private prisma: PrismaService,
    private pairingAlgorithm: PairingAlgorithmService,
  ) {
    // Initialize Gemini with API key from environment variable
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  GEMINI_API_KEY not set. AI-enhanced pairing features will be unavailable.');
      // Service will still work but AI features will fail gracefully
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Google AI Studio free tier - gemini-1.5-flash is faster and has better rate limits
      // Google AI Studio free tier - we will try multiple models
    }
  }

  /**
   * Helper to try multiple models if one fails (e.g. key doesn't support flash)
   */
  private async generateContentWithFallback(prompt: string): Promise<string> {
    if (!this.genAI) throw new Error('Gemini API not initialized');

    const modelsToTry = [
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash'
    ];
    let lastError;

    for (const modelName of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        // Attempt generation with a simple retry for rate limits
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
          } catch (retryError: any) {
            if (retryError.message.includes('429') || retryError.message.includes('Quota')) {
              if (attempt === 3) throw retryError;
              const delay = attempt * 2000;
              console.log(`Rate limit hit on ${modelName}, retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              throw retryError;
            }
          }
        }
      } catch (error: any) {
        console.warn(`Model ${modelName} failed:`, error.message);
        lastError = error;
        // Continue to next model
      }
    }

    throw lastError || new Error('All Gemini models failed');
  }

  /**
   * Use Gemini to enhance categorization with natural language understanding
   */
  async enhanceCategorization(userId: string): Promise<ParticipantCategory & { aiInsights?: string }> {
    // Get base categorization
    const baseCategory = await this.pairingAlgorithm.categorizeParticipant(userId);

    // Check if Gemini is initialized
    if (!this.model) {
      return {
        ...baseCategory,
        aiInsights: 'AI analysis unavailable: GEMINI_API_KEY not configured',
      };
    }

    // Get assessment answers
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
      return baseCategory;
    }

    const answers = assessment.answers as any;

    // Create a natural language summary for Gemini
    const prompt = this.buildCategorizationPrompt(answers, baseCategory);

    try {
      const aiInsights = await this.generateContentWithFallback(prompt);

      return {
        ...baseCategory,
        aiInsights: aiInsights.trim(),
      };
    } catch (error: any) {
      console.error('Gemini categorization error:', error);
      // Return base categorization with error note
      return {
        ...baseCategory,
        aiInsights: `AI analysis unavailable: ${error.message || 'Service error'}`,
      };
    }

  }

  /**
   * Analyze multiple groups in a single batch to avoid rate limits
   */
  async analyzeGroupsBatch(groups: Group[]): Promise<Array<Group & { aiAnalysis?: string; conversationStarters?: string[]; name?: string }>> {
    if (!this.genAI) {
      return groups.map(g => ({ ...g, aiAnalysis: 'AI unavailable' }));
    }

    const prompt = `
         Analyze the following ${groups.length} groups. For EACH group, provide:
         1. A creative group name (fun/theme based on participants).
         2. A brief analysis of their compatibility.
         3. 2 conversation starters.

         Input Data (JSON):
         ${JSON.stringify(groups.map((g, i) => ({
      id: i,
      participants: g.participants,
      avgAge: g.averageAge,
      gender: g.genderDistribution
    })))}

         Output ONLY valid JSON array:
         [
           {
             "id": 0,
             "name": "The Techies",
             "analysis": "...",
             "conversationStarters": ["...","..."]
           },
           ...
         ]
       `;

    try {
      const text = await this.generateContentWithFallback(prompt);
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const results = JSON.parse(cleanText);

      // Map results back to groups
      return groups.map((g, i) => {
        const res = results.find((r: any) => r.id === i);
        return {
          ...g,
          name: res?.name || `Group ${i + 1}`,
          aiAnalysis: res?.analysis || 'Analysis failed',
          conversationStarters: res?.conversationStarters || []
        };
      });
    } catch (error) {
      console.warn('Batch analysis failed:', error);
      return groups;
    }
  }

  /**
   * Use Gemini to analyze group compatibility and provide insights
   */
  async analyzeGroupCompatibility(group: Group): Promise<Group & { aiAnalysis?: string; conversationStarters?: string[] }> {
    // Check if Gemini is initialized
    if (!this.genAI) {
      return {
        ...group,
        aiAnalysis: 'AI analysis unavailable: GEMINI_API_KEY not configured',
        conversationStarters: [],
      };
    }

    const participantsSummary = group.participants.map((p) => {
      return {
        category: p.category,
        age: p.age,
        gender: p.gender,
        budget: p.budget,
        keyTraits: this.extractKeyTraits(p.assessmentAnswers),
      };
    });

    const prompt = this.buildGroupAnalysisPrompt(participantsSummary, group);

    try {
      const analysis = await this.generateContentWithFallback(prompt);

      // Extract conversation starters if provided
      const conversationStarters = this.extractConversationStarters(analysis);

      return {
        ...group,
        aiAnalysis: analysis.trim(),
        conversationStarters,
      };
    } catch (error: any) {
      console.error('Gemini group analysis error:', error);
      // Return group with error note
      return {
        ...group,
        aiAnalysis: `AI analysis unavailable: ${error.message || 'Service error'}`,
        conversationStarters: [],
      };
    }
  }

  /**
   * Use Gemini to generate optimal groups with AI insights
   * If strict constraints fail, Gemini will suggest the best possible groups
   */
  async generateOptimalGroups(
    eventId: string,
    groupSize: number = 6,
    options: { allowConstraintRelaxation?: boolean } = {},
  ): Promise<(Group & { aiAnalysis?: string; conversationStarters?: string[]; constraintsRelaxed?: boolean })[]> {
    // Try strict mode first
    const baseGroups = await this.pairingAlgorithm.generateGroups(eventId, groupSize);

    // If we got groups, enhance with AI analysis in a single batch
    if (baseGroups.length > 0) {
      console.log(`Analyzing ${baseGroups.length} groups in batch...`);
      const enhancedGroups = await this.analyzeGroupsBatch(baseGroups);
      return enhancedGroups.map(g => ({ ...g, constraintsRelaxed: false }));
    }

    // Strict mode failed - use Gemini for intelligent constraint relaxation
    console.log('Strict mode failed, using Gemini for intelligent group formation...');

    if (!this.genAI || !options.allowConstraintRelaxation) {
      // No Gemini or relaxation not allowed - return empty
      return [];
    }

    // Get all guests for the event
    const pairingGuests = await this.prisma.pairingGuest.findMany({
      where: { eventId },
    });

    if (pairingGuests.length < 5) {
      return [];
    }

    // Build prompt for Gemini to form optimal groups
    const guestProfiles = pairingGuests.map((g, i) => ({
      index: i + 1,
      name: g.name,
      age: g.age,
      gender: g.gender,
      personality: g.personality,
    }));

    const prompt = `You are an intelligent pairing algorithm for Enqoy dining events.

We have ${pairingGuests.length} guests to form into groups of ${groupSize}.

Guests:
${JSON.stringify(guestProfiles, null, 2)}

Pairing Rules (in order of importance):
1. Personality Category Compatibility - use the Best Pairing Matrix:
   - Trailblazers pair with Free Spirits, Storytellers
   - Storytellers pair with Philosophers, Trailblazers
   - Philosophers pair with Planners, Storytellers
   - Planners pair with Philosophers, Free Spirits
   - Free Spirits pair with Trailblazers, Planners

2. Age Compatibility - prefer within 5 years difference, but can relax if needed

3. Budget Compatibility - prefer same budget range, but can relax if needed

4. Gender Balance - for ${groupSize} people: ${groupSize === 5 ? '2-3 or 3-2 split' : '3-3, 4-2, or 2-4 split'}

Form the best possible groups. If strict constraints cannot be met, explain what was relaxed and why.

For each group, generate a creative "groupName" based on their shared traits (e.g., "The Culinary Philosophers", "Weekend Foodies").

Respond in JSON format:
{
  "groups": [
    {
      "guestIndexes": [1, 2, 3, 4, 5],
      "relaxedConstraints": ["age difference of 5 years between guests 1 and 3"],
      "reasoning": "Why this group works well together",
      "groupName": "The Culinary Philosophers"
    }
  ],
  "unassigned": [6, 7],
  "overallAnalysis": "Summary of grouping decisions"
}`;

    try {
      const text = await this.generateContentWithFallback(prompt);

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from Gemini response');
      }

      const groupingSuggestion = JSON.parse(jsonMatch[0]);
      const groups: (Group & { aiAnalysis?: string; conversationStarters?: string[]; constraintsRelaxed?: boolean })[] = [];

      for (const suggestedGroup of groupingSuggestion.groups || []) {
        const participants = suggestedGroup.guestIndexes.map((idx: number) => {
          const guest = pairingGuests[idx - 1];
          const personality = guest.personality as any;
          return {
            userId: guest.id,
            category: this.inferCategory(personality) as PersonalityCategory,
            scores: { Trailblazers: 0, Storytellers: 0, Philosophers: 0, Planners: 0, 'Free Spirits': 1 },
            age: guest.age || undefined,
            gender: guest.gender || undefined,
            budget: personality?.spending,
            assessmentAnswers: personality || {},
          };
        });

        const group = this.pairingAlgorithm.createGroup(participants, suggestedGroup.groupName);
        groups.push({
          ...group,
          aiAnalysis: `${suggestedGroup.reasoning}\n\nRelaxed constraints: ${suggestedGroup.relaxedConstraints?.join(', ') || 'None'}`,
          conversationStarters: [],
          constraintsRelaxed: suggestedGroup.relaxedConstraints?.length > 0,
        });
      }

      // Analyze each group for conversation starters
      for (let i = 0; i < groups.length; i++) {
        const analyzed = await this.analyzeGroupCompatibility(groups[i]);
        groups[i].conversationStarters = analyzed.conversationStarters;
      }

      return groups;
    } catch (error: any) {
      console.error('Gemini constraint relaxation failed:', error);
      return [];
    }
  }

  /**
   * Infer personality category from assessment answers
   */
  private inferCategory(answers: any): string {
    if (!answers) return 'Free Spirits';

    const scores: Record<string, number> = {
      Trailblazers: 0,
      Storytellers: 0,
      Philosophers: 0,
      Planners: 0,
      'Free Spirits': 0,
    };

    // Simple scoring based on key answers
    if (answers.dinnerVibe === 'steering') scores.Storytellers += 2;
    if (answers.dinnerVibe === 'adapting') scores['Free Spirits'] += 2;
    if (answers.dinnerVibe === 'observing') scores.Philosophers += 2;
    if (answers.groupDynamic === 'diverse') scores.Trailblazers += 2;
    if (answers.groupDynamic === 'similar') scores.Planners += 2;

    const maxCategory = Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b));
    return maxCategory[0];
  }

  /**
   * Use Gemini to suggest pairings for specific participants
   */
  async suggestBestPairings(
    eventId: string,
    participantId: string,
    otherParticipants: ParticipantCategory[],
  ): Promise<{ participant: ParticipantCategory; bestMatches: Array<{ participant: ParticipantCategory; score: number; reason: string }> }> {
    const participant = await this.pairingAlgorithm.categorizeParticipant(participantId);

    // Check if Gemini is initialized
    if (!this.genAI) {
      // Fallback to algorithm-based matching
      const bestPairings = this.pairingAlgorithm.getBestPairings(participant.category);
      const matches = otherParticipants
        .filter((p) => bestPairings.includes(p.category))
        .map((p) => ({
          participant: p,
          score: this.calculateMatchScore(participant, p),
          reason: `Category compatibility: ${participant.category} pairs well with ${p.category}`,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return {
        participant,
        bestMatches: matches,
      };
    }

    const prompt = this.buildPairingSuggestionPrompt(participant, otherParticipants);

    try {
      const suggestions = await this.generateContentWithFallback(prompt);

      // Parse Gemini's response to extract matches
      const matches = this.parsePairingSuggestions(suggestions, otherParticipants);

      // If parsing failed, fallback to algorithm
      if (matches.length === 0) {
        throw new Error('Failed to parse AI suggestions');
      }

      return {
        participant,
        bestMatches: matches,
      };
    } catch (error: any) {
      console.error('Gemini pairing suggestion error:', error);
      // Fallback to algorithm-based matching
      const bestPairings = this.pairingAlgorithm.getBestPairings(participant.category);
      const matches = otherParticipants
        .filter((p) => bestPairings.includes(p.category))
        .map((p) => ({
          participant: p,
          score: this.calculateMatchScore(participant, p),
          reason: `Category compatibility: ${participant.category} pairs well with ${p.category}`,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return {
        participant,
        bestMatches: matches,
      };
    }
  }

  /**
   * Build prompt for categorization enhancement
   */
  private buildCategorizationPrompt(answers: any, baseCategory: ParticipantCategory): string {
    return `You are analyzing a personality assessment for Enqoy, a social dining platform. 

The participant has been categorized as: ${baseCategory.category}
Category scores: ${JSON.stringify(baseCategory.scores)}

Assessment responses:
- Talk topic preference: ${answers.talkTopic || 'Not specified'}
- Group dynamic preference: ${answers.groupDynamic || 'Not specified'}
- Dinner vibe: ${answers.dinnerVibe || 'Not specified'}
- Humor style: ${answers.humorType || 'Not specified'}
- Wardrobe style: ${answers.wardrobeStyle || 'Not specified'}
- Introversion scale (1-5): ${answers.introvertScale || 'Not specified'}
- Alone time preference (1-5): ${answers.aloneTimeScale || 'Not specified'}
- Family importance (1-5): ${answers.familyScale || 'Not specified'}
- Spirituality importance (1-5): ${answers.spiritualityScale || 'Not specified'}
- Humor importance (1-5): ${answers.humorScale || 'Not specified'}
- Meeting priority: ${answers.meetingPriority || 'Not specified'}

Provide a brief (2-3 sentences) insight about this participant's personality and why they fit the ${baseCategory.category} category. Focus on their social energy, conversational style, and what makes them engaging in group settings.`;
  }

  /**
   * Build prompt for group compatibility analysis
   */
  private buildGroupAnalysisPrompt(participants: any[], group: Group): string {
    const participantsList = participants
      .map(
        (p, i) => `
Participant ${i + 1}:
- Category: ${p.category}
- Age: ${p.age || 'Not specified'}
- Gender: ${p.gender || 'Not specified'}
- Budget: ${p.budget || 'Not specified'}
- Key Traits: ${p.keyTraits.join(', ')}`,
      )
      .join('\n');

    return `You are analyzing a dining group for Enqoy. This group consists of ${group.participants.length} participants:

${participantsList}

Group Statistics:
- Category Distribution: ${JSON.stringify(group.categoryDistribution)}
- Gender Distribution: ${JSON.stringify(group.genderDistribution)}
- Average Age: ${group.averageAge}
- Budget: ${group.budget}
- Compatibility Score: ${group.compatibilityScore}

Analyze this group's compatibility and provide:
1. A brief analysis (2-3 sentences) of why this group will work well together
2. Potential conversation topics that would engage everyone
3. Any potential challenges and how to address them
4. 3-5 conversation starter questions tailored to this specific group mix

Format your response clearly with sections.`;
  }

  /**
   * Build prompt for pairing suggestions
   */
  private buildPairingSuggestionPrompt(
    participant: ParticipantCategory,
    others: ParticipantCategory[],
  ): string {
    const othersList = others
      .map(
        (p, i) => `
Option ${i + 1}:
- Category: ${p.category}
- Age: ${p.age || 'Not specified'}
- Gender: ${p.gender || 'Not specified'}
- Budget: ${p.budget || 'Not specified'}`,
      )
      .join('\n');

    return `You are helping match participants for Enqoy dining events.

Main Participant:
- Category: ${participant.category}
- Age: ${participant.age || 'Not specified'}
- Gender: ${participant.gender || 'Not specified'}
- Budget: ${participant.budget || 'Not specified'}

Potential Matches:
${othersList}

Based on the pairing rules:
- ${participant.category} pairs best with: ${this.pairingAlgorithm.getBestPairings(participant.category).join(', ')}

Rank the top 5 best matches for this participant, considering:
1. Category compatibility
2. Age compatibility (within 5 years)
3. Budget matching
4. Overall group dynamic potential

For each match, provide a brief reason (1 sentence) why they would work well together.`;
  }

  /**
   * Extract key traits from assessment answers
   */
  private extractKeyTraits(answers: any): string[] {
    const traits: string[] = [];

    if (answers.talkTopic) traits.push(`Interested in: ${answers.talkTopic}`);
    if (answers.dinnerVibe) traits.push(`Dinner style: ${answers.dinnerVibe}`);
    if (answers.humorType) traits.push(`Humor: ${answers.humorType}`);
    if (answers.meetingPriority) traits.push(`Priority: ${answers.meetingPriority}`);

    return traits;
  }

  /**
   * Extract conversation starters from AI analysis
   */
  private extractConversationStarters(analysis: string): string[] {
    const starters: string[] = [];
    const lines = analysis.split('\n');

    let inStartersSection = false;
    for (const line of lines) {
      if (line.toLowerCase().includes('conversation starter') || line.toLowerCase().includes('icebreaker')) {
        inStartersSection = true;
        continue;
      }
      if (inStartersSection) {
        const match = line.match(/^\d+[\.\)]\s*(.+)/i) || line.match(/^[-•]\s*(.+)/i);
        if (match) {
          starters.push(match[1].trim());
        }
        if (starters.length >= 5) break;
      }
    }

    // Fallback: extract numbered or bulleted items
    if (starters.length === 0) {
      const numberedMatches = analysis.match(/\d+[\.\)]\s*([^\n]+)/g);
      if (numberedMatches) {
        starters.push(...numberedMatches.slice(0, 5).map((m) => m.replace(/^\d+[\.\)]\s*/, '').trim()));
      }
    }

    return starters.length > 0 ? starters : [
      'What brings everyone here tonight?',
      'What\'s the most interesting thing that happened to you this week?',
      'If you could travel anywhere right now, where would you go?',
    ];
  }

  /**
   * Parse pairing suggestions from Gemini response
   */
  private parsePairingSuggestions(suggestions: string, participants: ParticipantCategory[]): Array<{ participant: ParticipantCategory; score: number; reason: string }> {
    const matches: Array<{ participant: ParticipantCategory; score: number; reason: string }> = [];

    // Try to extract ranked suggestions
    const lines = suggestions.split('\n');
    for (const line of lines) {
      const match = line.match(/(?:Option|Participant|Match)\s*(\d+)[:\.]\s*(.+)/i);
      if (match) {
        const index = parseInt(match[1]) - 1;
        if (index >= 0 && index < participants.length) {
          const reason = match[2].trim();
          const score = 100 - index * 10; // Decreasing score for lower ranks
          matches.push({
            participant: participants[index],
            score,
            reason,
          });
        }
      }
    }

    return matches.slice(0, 5);
  }

  /**
   * Calculate match score between two participants
   */
  private calculateMatchScore(p1: ParticipantCategory, p2: ParticipantCategory): number {
    let score = 0;

    // Category compatibility
    const bestPairings = this.pairingAlgorithm.getBestPairings(p1.category);
    if (bestPairings.includes(p2.category)) {
      score += 50;
    }

    // Age compatibility
    if (this.pairingAlgorithm.isAgeCompatible(p1, p2)) {
      score += 25;
    }

    // Budget compatibility
    if (this.pairingAlgorithm.isBudgetCompatible(p1, p2)) {
      score += 25;
    }

    return score;
  }
}

