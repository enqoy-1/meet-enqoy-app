# Gemini AI Integration for Pairing Algorithm

## Overview

Google Gemini AI has been integrated into the Enqoy pairing system to enhance participant categorization and group compatibility analysis. The AI provides natural language insights, conversation starters, and intelligent pairing suggestions.

## Features

### 1. **Enhanced Categorization**
- Uses Gemini to provide deeper insights into participant personalities
- Explains why participants fit their assigned category
- Provides natural language descriptions of social energy and conversational style

**Endpoint:** `GET /api/pairing/events/:eventId/categorize/:userId/ai`

### 2. **Group Compatibility Analysis**
- Analyzes entire groups (5-6 participants) for compatibility
- Identifies potential conversation topics
- Highlights potential challenges and solutions
- Generates tailored conversation starter questions

**Endpoint:** `POST /api/pairing/events/:eventId/analyze-group`
```json
{
  "participantIds": ["user1", "user2", "user3", "user4", "user5"]
}
```

### 3. **AI-Enhanced Group Generation**
- Automatically generates optimal groups with AI insights
- Each group includes:
  - Compatibility analysis
  - Conversation starters
  - Group dynamic insights

**Endpoint:** `POST /api/pairing/events/:eventId/generate-groups`
```json
{
  "groupSize": 6,
  "useAI": true
}
```

### 4. **Intelligent Pairing Suggestions**
- Suggests best matches for a specific participant
- Provides reasoning for each match
- Considers category compatibility, age, budget, and group dynamics

**Endpoint:** `GET /api/pairing/events/:eventId/suggest-pairings/:userId`

## Configuration

### API Key Setup

The Gemini API key is configured in `backend/src/pairing/gemini-pairing.service.ts`. 

**For production, set environment variable:**
```bash
GEMINI_API_KEY=your_api_key_here
```

**Current API Key:** `AIzaSyCx3OpmSKJCOZcWSS1CGS6qMPrZ4iCJch0`

## How It Works

### Categorization Enhancement
1. Base algorithm categorizes participant (Trailblazers, Storytellers, etc.)
2. Gemini analyzes assessment responses in natural language
3. Provides insights about personality traits and social style
4. Returns enhanced categorization with AI insights

### Group Analysis
1. Algorithm creates optimal groups based on rules
2. Gemini analyzes the group composition
3. Identifies:
   - Why the group will work well together
   - Conversation topics that engage everyone
   - Potential challenges
   - Tailored conversation starters

### Pairing Suggestions
1. Analyzes a participant's traits
2. Compares with all other participants
3. Ranks matches with explanations
4. Considers multiple compatibility factors

## Response Format

### Enhanced Categorization Response
```json
{
  "userId": "user123",
  "category": "Storytellers",
  "scores": {
    "Trailblazers": 2,
    "Storytellers": 8,
    "Philosophers": 3,
    "Planners": 4,
    "Free Spirits": 3
  },
  "age": 28,
  "gender": "female",
  "budget": "500-1000",
  "aiInsights": "This participant is a natural Storyteller who thrives in group settings..."
}
```

### Group Analysis Response
```json
{
  "participants": [...],
  "categoryDistribution": {...},
  "genderDistribution": {...},
  "averageAge": 29,
  "budget": "500-1000",
  "compatibilityScore": 85,
  "aiAnalysis": "This group combines diverse perspectives...",
  "conversationStarters": [
    "What's the most interesting place you've traveled to?",
    "If you could have dinner with anyone, who would it be?",
    ...
  ]
}
```

## Error Handling

- All Gemini calls have fallback to base algorithm
- Errors are logged but don't break the pairing process
- If AI is unavailable, system uses rule-based pairing

## Usage Examples

### Generate AI-Enhanced Groups
```typescript
const groups = await pairingApi.generateGroups(eventId, 6, true);
// Returns groups with AI analysis and conversation starters
```

### Analyze Specific Group
```typescript
const analysis = await pairingApi.analyzeGroup(eventId, [
  'user1', 'user2', 'user3', 'user4', 'user5'
]);
// Returns compatibility analysis and conversation starters
```

### Get Pairing Suggestions
```typescript
const suggestions = await pairingApi.suggestPairings(eventId, userId);
// Returns ranked list of best matches with explanations
```

## Benefits

1. **Better Understanding**: Natural language insights help admins understand participants
2. **Engagement**: Conversation starters tailored to each group
3. **Quality**: AI considers nuanced factors beyond simple rules
4. **Flexibility**: Can work with or without AI (fallback to algorithm)

## Next Steps

1. Add UI components to display AI insights in admin panel
2. Show conversation starters in event details for participants
3. Use AI insights for pre-event communications
4. Track group success rates to improve prompts









