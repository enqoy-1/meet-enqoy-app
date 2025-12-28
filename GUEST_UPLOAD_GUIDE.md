# Guest Inventory Upload Guide

## 📋 Overview

You can upload your guest inventory with personality assessment data directly through the Admin Pairing interface.

## 🚀 How to Upload

### Step 1: Access the Pairing Interface
1. Go to: `http://localhost:8080/admin/pairings`
2. Select the event you want to add guests to
3. Click on the **"Guest Management"** tab

### Step 2: Prepare Your JSON File

Use the template at `guest-inventory-template.json` or create your own following this format:

```json
[
  {
    "name": "Full Name",
    "first_name": "First",
    "last_name": "Last",
    "email": "email@example.com",
    "gender": "male" | "female" | "other",
    "age": 28,
    "tags": ["tag1", "tag2"],
    "dietaryNotes": "Any dietary restrictions",

    "personality": {
      "talkTopic": "...",
      "groupDynamic": "...",
      "dinnerVibe": "...",
      "spending": 1000,
      "relationshipStatus": "single" | "married" | "committed",
      "hasChildren": true | false,
      ...
    }
  }
]
```

### Step 3: Upload via UI
1. Click the **"Upload JSON"** button (looks like 📤 FileUp icon)
2. Select your prepared JSON file
3. The system will import all guests with their personality data
4. You'll see a success message showing how many guests were imported

## 📝 Field Reference

### Required Fields
- `name` (string) - Full name of the guest
- `first_name` (string) - First name
- `last_name` (string) - Last name

### Optional Basic Fields
- `email` (string) - Email address
- `gender` (string) - "male", "female", or "other"
- `age` (number) - Age in years
- `tags` (array) - Tags for categorization, e.g., ["vip", "first-timer"]
- `dietaryNotes` (string) - Dietary restrictions or preferences

### Personality Assessment Fields

All personality fields are optional. If provided, they're used for intelligent pairing:

#### Conversation Preferences
- `talkTopic` (string)
  - `current_events` - Current events/world issues
  - `arts_entertainment` - Arts/entertainment
  - `personal_growth` - Personal growth/philosophy
  - `food_travel` - Food/travel/experiences
  - `hobbies` - Hobbies/niche interests

- `groupDynamic` (string)
  - `similar` - Mix of similar people
  - `diverse` - Diverse group

- `dinnerVibe` (string)
  - `steering` - Steering the conversation
  - `sharing` - Sharing stories
  - `observing` - Observing and listening
  - `adapting` - Adapting to the flow

#### Personality Traits (1-10 scales)
- `introvertScale` (number 1-10) - 1 = very extroverted, 10 = very introverted
- `aloneTimeScale` (number 1-10) - How much alone time needed
- `familyScale` (number 1-10) - Importance of family
- `spiritualityScale` (number 1-10) - Importance of spirituality
- `humorScale` (number 1-10) - Importance of humor

#### Style Preferences
- `humorType` (string) - "witty", "playful", "dry", "sarcastic"
- `wardrobeStyle` (string) - "casual", "trendy", "formal", "eclectic"

#### Life Situation
- `spending` (number) - Monthly spending budget (e.g., 500, 1000, 1500)
- `relationshipStatus` (string) - "single", "married", "committed", "divorced"
- `hasChildren` (boolean) - true or false
- `meetingPriority` (string) - "friendship", "networking", "romantic"

## 🎯 Pairing Algorithm Usage

The system uses this data to create optimal groups based on:

### 1. **Personality Categories** (Auto-assigned)
Based on assessment responses, guests are categorized as:
- **Trailblazers**: Adventurous, outgoing
- **Storytellers**: Expressive, social
- **Philosophers**: Thoughtful, introspective
- **Planners**: Organized, structured
- **Free Spirits**: Flexible, easygoing

### 2. **Compatibility Rules**
- **Age**: ±5 years preferred
- **Budget**: Same spending range
- **Relationship Status**: Singles with singles, committed with committed
- **Gender**: Balanced distribution
- **Personality**: Best pairing categories together

## 💡 Tips

1. **Minimum Data**: At minimum, provide name and basic demographics
2. **Personality Data**: More assessment data = better pairing quality
3. **Missing Data**: Use "Fill Missing Personality" button to generate random data for testing
4. **Bulk Upload**: Upload all guests at once in a single JSON array
5. **Validation**: The system validates email format, required fields, etc.

## 🔄 Alternative: Import from Bookings

If your guests have already booked the event:
1. They'll be automatically imported when you open the pairing page
2. If they completed the personality assessment during signup, that data comes with them
3. Use "Fill Missing Personality" for any guests missing assessment data

## 📊 After Upload

Once uploaded, you can:
1. **View Guests** - See all imported guests with their categories
2. **Generate Groups** - Use the "Pairing Board" tab to create groups
3. **Add Restaurants** - Specify venues for the groups
4. **Distribute** - Assign groups to restaurants and tables
5. **Export** - Download seating charts and assignments

## 🚨 Common Issues

**Problem**: "Failed to parse file"
- **Solution**: Ensure your JSON is valid (use a JSON validator)

**Problem**: Guests missing personality data
- **Solution**: Either:
  - Add complete personality objects to your JSON
  - Use "Fill Missing Personality" button after upload

**Problem**: Some guests didn't import
- **Solution**: Check console for errors. Ensure required fields (name, first_name, last_name) are present

## 📞 Example Use Cases

### Case 1: New Event with Pre-registered Guests
```json
[
  {"name": "Alice Brown", "first_name": "Alice", "last_name": "Brown", "email": "alice@example.com", "age": 28, "gender": "female"},
  {"name": "Bob Wilson", "first_name": "Bob", "last_name": "Wilson", "email": "bob@example.com", "age": 32, "gender": "male"}
]
```

### Case 2: Event with Full Assessment Data
Use the complete template from `guest-inventory-template.json` with all personality fields filled.

### Case 3: Mixed Data Quality
Some guests with full data, others with minimal:
```json
[
  {
    "name": "Sarah Lee",
    "first_name": "Sarah",
    "last_name": "Lee",
    "age": 27,
    "personality": { "talkTopic": "arts_entertainment", "spending": 800 }
  },
  {
    "name": "Tom Davis",
    "first_name": "Tom",
    "last_name": "Davis"
  }
]
```

---

Need help? The system is designed to be forgiving - upload what you have, and use AI features to fill gaps!
