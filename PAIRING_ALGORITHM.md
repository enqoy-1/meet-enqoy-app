# Enqoy Pairing Algorithm Documentation

## Overview

The Enqoy pairing algorithm is an intelligent system designed to create optimal dining groups for social events. It combines personality-based categorization with constraint-based optimization to form groups of 5-6 participants that will have engaging, compatible conversations.

## Core Components

### 1. Personality Categorization

The algorithm categorizes participants into one of five personality types based on their assessment responses:

- **Trailblazers**: Adventurous, trend-setting individuals who enjoy exploring new experiences
- **Storytellers**: Engaging conversationalists who love sharing experiences and steering discussions
- **Philosophers**: Thoughtful, introspective individuals who enjoy deep conversations
- **Planners**: Organized, thoughtful individuals who prefer structured interactions
- **Free Spirits**: Adaptable, easy-going individuals who go with the flow

### 2. Categorization Process

#### Assessment Questions & Weighting

The algorithm analyzes multiple assessment questions with different weights:

**High Weight (3x):**
- **Dinner Vibe**: How participants behave at dinner
  - `steering` → Storytellers (+6)
  - `sharing` → Storytellers (+3), Planners (+3)
  - `observing` → Philosophers (+3), Planners (+3)
  - `adapting` → Free Spirits (+6)

**Medium Weight (2x):**
- **Talk Topic**: Preferred conversation topics
  - Current events/world issues → Philosophers (+4)
  - Arts/entertainment → Storytellers (+2), Free Spirits (+2)
  - Personal growth/philosophy → Philosophers (+2), Planners (+2)
  - Food/travel/experiences → Trailblazers (+2), Free Spirits (+2)
  - Hobbies/niche interests → Trailblazers (+2), Storytellers (+2)

- **Group Dynamic**: Preferred group composition
  - Mix of similar people → Storytellers (+2), Planners (+2), Philosophers (+2)
  - Diverse group → Trailblazers (+2), Free Spirits (+2)

**Low Weight (1x):**
- Humor type, wardrobe style, introversion scale, alone time preference, family importance, spirituality scale, humor importance, meeting priority

The participant is assigned to the category with the highest total score.

### 3. Best Pairing Matrix

The algorithm uses a predefined compatibility matrix:

| Category | Best Pairs With |
|----------|----------------|
| Trailblazers | Free Spirits, Storytellers |
| Storytellers | Philosophers, Trailblazers |
| Philosophers | Planners, Storytellers |
| Planners | Philosophers, Free Spirits |
| Free Spirits | Trailblazers, Planners |

## Group Formation Logic

### Group Size Rules

The algorithm follows these rules based on total participant count:

1. **< 4 participants**: Event should be postponed (returns empty groups)
2. **4-9 participants**: Create ONE group (no splitting)
3. **10+ participants**: Split into multiple groups of 5-6 people

### Group Size Distribution

When splitting 10+ participants:
- Prefer groups of 6, then 5
- Calculate: `numGroups = ceil(totalParticipants / 6)`
- Distribute evenly with some groups getting +1 person

### Constraints (In Order of Priority)

1. **Avoid Pairs (NEVER relaxed)**: Participants who should not be paired together
2. **Budget Compatibility**: Participants should have matching budget ranges
   - Categories: `500-1000`, `1000-1500`, `1500+`, `<500`
3. **Age Compatibility**: Maximum 5 years difference between any two participants
4. **Relationship Status**: Singles prefer singles, committed people prefer committed
5. **Gender Balance**: Preferred but not strictly enforced
   - 5-person groups: 2-3 or 3-2 split
   - 6-person groups: 3-3, 4-2, or 2-4 split

### Group Formation Modes

#### Strict Mode
- Respects ALL constraints (budget, age, relationship status, gender balance)
- Only relaxes if absolutely necessary
- Returns empty array if strict constraints cannot be met

#### Lenient Mode (Fallback)
- Only enforces avoid pairs (never relaxed)
- Relaxes budget, age, and relationship constraints
- Distributes participants evenly across groups
- Used when strict mode fails

### Group Formation Algorithm

1. **Fetch Participants**
   - Primary: From `PairingGuest` records (if available)
   - Fallback: From `Booking` records with confirmed status

2. **Categorize Participants**
   - For each participant, calculate personality scores
   - Assign to highest-scoring category
   - Extract age, gender, budget, relationship status

3. **Apply Avoid Constraints**
   - Check `PairingConstraint` records with type `avoid_pair`
   - Never place constrained participants in the same group

4. **Form Groups (Strict Mode)**
   - Start with a seed participant
   - Iteratively add best-scoring compatible candidates
   - Score candidates based on:
     - Category compatibility (best pairings)
     - Age compatibility
     - Budget compatibility
     - Relationship status compatibility
   - Stop if no compatible candidate found (strict mode fails)

5. **Form Groups (Lenient Mode - if strict fails)**
   - Shuffle participants randomly
   - Distribute across groups, respecting avoid constraints
   - Fill groups to target size

### Compatibility Scoring

For each potential group, the algorithm calculates a compatibility score:

- **Category Compatibility**: +10 points per pair if categories are best matches
- **Age Compatibility**: +5 points if within 5 years, -10 if not
- **Budget Compatibility**: +5 points if matching, -5 if not

Total score is the sum of all pairwise scores in the group.

## AI Enhancement (Google Gemini Integration)

### Enhanced Categorization

Uses Google Gemini AI to provide natural language insights about participants:
- Analyzes assessment responses
- Provides 2-3 sentence personality insights
- Explains why participant fits their category

### Group Compatibility Analysis

For each formed group, Gemini provides:
- Compatibility analysis (2-3 sentences)
- Potential conversation topics
- Potential challenges and solutions
- 3-5 tailored conversation starter questions

### Intelligent Constraint Relaxation

When strict mode fails:
- Gemini analyzes all participants
- Suggests optimal groups with relaxed constraints
- Explains what constraints were relaxed and why
- Provides reasoning for each group formation

### Pairing Suggestions

For a specific participant:
- Analyzes their personality and preferences
- Ranks top 5 best matches from available participants
- Provides reasons for each match
- Considers category, age, budget, and group dynamic potential

## Scenarios & Use Cases

### Scenario 1: Small Event (4-9 participants)

**Example**: 7 participants registered for an event

**Algorithm Behavior**:
- Creates ONE group with all 7 participants
- Applies strict constraints (budget, age, relationship status)
- Ensures gender balance if possible
- Respects avoid pairs

**Result**: Single group of 7 people

---

### Scenario 2: Medium Event (10-18 participants)

**Example**: 15 participants registered

**Algorithm Behavior**:
- Calculates: `ceil(15/6) = 3 groups`
- Target sizes: 5, 5, 5 (or 6, 5, 4)
- Tries strict mode first
- If strict fails, uses lenient mode

**Result**: 3 groups (e.g., 5-5-5 or 6-5-4)

---

### Scenario 3: Large Event (19+ participants)

**Example**: 24 participants registered

**Algorithm Behavior**:
- Calculates: `ceil(24/6) = 4 groups`
- Target sizes: 6, 6, 6, 6
- Distributes evenly
- Applies constraints as strictly as possible

**Result**: 4 groups of 6 people each

---

### Scenario 4: Insufficient Participants

**Example**: 3 participants registered

**Algorithm Behavior**:
- Detects less than 4 participants
- Returns empty groups array
- Logs: "Event should be postponed"

**Result**: No groups formed, event should be postponed

---

### Scenario 5: Strict Constraints Cannot Be Met

**Example**: 12 participants, but budget/age constraints are too restrictive

**Algorithm Behavior**:
1. Tries strict mode
2. Fails to form groups (no compatible candidates)
3. Falls back to lenient mode
4. Only enforces avoid pairs
5. Distributes participants evenly

**Result**: Groups formed with relaxed constraints

---

### Scenario 6: AI-Enhanced Grouping

**Example**: Admin requests AI-enhanced group generation

**Algorithm Behavior**:
1. Runs base algorithm (strict or lenient)
2. For each group:
   - Analyzes compatibility with Gemini
   - Generates conversation starters
   - Provides insights
3. If strict mode fails:
   - Uses Gemini to suggest optimal groups
   - Explains constraint relaxations
   - Provides reasoning

**Result**: Groups with AI analysis and conversation starters

---

### Scenario 7: Avoid Pairs Constraint

**Example**: Two participants have a history and should not be paired

**Algorithm Behavior**:
- Checks `PairingConstraint` records
- Never places constrained participants together
- Even in lenient mode, avoid pairs are NEVER relaxed

**Result**: Constrained participants in different groups

---

### Scenario 8: Mixed Relationship Statuses

**Example**: Event has both single and married participants

**Algorithm Behavior**:
- In strict mode: Groups singles with singles, committed with committed
- In lenient mode: Relationship status constraint is relaxed
- Still tries to optimize for compatibility

**Result**: Groups formed with relationship status considered (strict) or relaxed (lenient)

---

### Scenario 9: Age Range Challenges

**Example**: Participants range from 25 to 45 years old

**Algorithm Behavior**:
- Strict mode: Only pairs participants within 5 years
- May create age-segregated groups (25-30, 35-40, etc.)
- Lenient mode: Relaxes age constraint but still considers it

**Result**: Groups with similar ages (strict) or mixed ages (lenient)

---

### Scenario 10: Budget Mismatch

**Example**: Mix of `500-1000` and `1500+` budget participants

**Algorithm Behavior**:
- Strict mode: Only groups participants with same budget
- May create budget-segregated groups
- Lenient mode: Relaxes budget constraint

**Result**: Budget-matched groups (strict) or mixed budgets (lenient)

## API Endpoints

### Categorization
- `GET /pairing/events/:eventId/categorize/:userId` - Categorize a single participant
- `GET /pairing/events/:eventId/categorize/:userId/ai` - AI-enhanced categorization
- `GET /pairing/events/:eventId/categorize-all` - Categorize all participants

### Group Generation
- `POST /pairing/events/:eventId/generate-groups` - Generate groups (with `useAI` flag)
  - Body: `{ useAI: boolean, groupSize?: 5 | 6 }`

### Group Analysis
- `POST /pairing/events/:eventId/analyze-group` - Analyze a specific group with AI
  - Body: `{ participantIds: string[] }`

### Pairing Suggestions
- `GET /pairing/events/:eventId/suggest-pairings/:userId` - Get best matches for a participant

## Data Flow

1. **Participant Registration** → User completes personality assessment
2. **Event Booking** → User books event (creates Booking record)
3. **Import to Pairing** → Admin imports bookings as PairingGuest records
4. **Categorization** → Algorithm categorizes each participant
5. **Group Generation** → Algorithm forms optimal groups
6. **AI Enhancement** (optional) → Gemini analyzes groups and provides insights
7. **Group Assignment** → Participants are assigned to groups

## Error Handling

- **No Assessment**: Participant defaults to "Free Spirits" category
- **Missing Data**: Age/gender/budget defaults to undefined (constraints relaxed)
- **API Failures**: AI features gracefully degrade to algorithm-only mode
- **Constraint Violations**: Algorithm falls back to lenient mode

## Performance Considerations

- **Greedy Algorithm**: Uses iterative candidate selection (O(n²) complexity)
- **Strict Mode**: May fail quickly if constraints are too restrictive
- **Lenient Mode**: Always succeeds but may have lower compatibility scores
- **AI Calls**: Async and can be slow; consider caching results

## Future Enhancements

- Machine learning for dynamic pairing matrix
- Real-time group adjustments
- Participant feedback integration
- Historical success rate tracking
- Multi-event participant matching








