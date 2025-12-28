const fs = require('fs');
const path = require('path');

// Read CSV file
const csvPath = 'C:\\Users\\Lu\\Downloads\\Enqoy Test - Sheet1.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Proper CSV parser
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

// Parse CSV
const lines = csvContent.split('\n');
const headers = parseCSVLine(lines[0]);

console.log(`Found ${headers.length} columns`);
console.log(`Column 23: ${headers[23]}`); // First name
console.log(`Column 24: ${headers[24]}`); // Last name
console.log(`Column 25: ${headers[25]}`); // Email

// Map assessment values
const mapDinnerVibe = (value) => {
  if (!value) return undefined;
  if (value.includes('steering')) return 'steering';
  if (value.includes('sharing')) return 'sharing';
  if (value.includes('observe')) return 'observing';
  if (value.includes('adapt')) return 'adapting';
  return undefined;
};

const mapTalkTopic = (value) => {
  if (!value) return undefined;
  if (value.includes('Current events')) return 'current_events';
  if (value.includes('Arts')) return 'arts_entertainment';
  if (value.includes('Personal growth')) return 'personal_growth';
  if (value.includes('Food, travel')) return 'food_travel';
  if (value.includes('Hobbies')) return 'hobbies';
  return undefined;
};

const mapGroupDynamic = (value) => {
  if (!value) return undefined;
  if (value.includes('similar')) return 'similar';
  if (value.includes('diverse')) return 'diverse';
  return undefined;
};

const mapHumorType = (value) => {
  if (!value) return undefined;
  if (value.includes('Clever')) return 'witty';
  if (value.includes('Playful')) return 'playful';
  if (value.includes('Sarcastic')) return 'dry';
  if (value.includes('not a big fan')) return 'none';
  return 'playful';
};

const mapWardrobeStyle = (value) => {
  if (!value) return undefined;
  if (value.includes('Bold')) return 'trendy';
  if (value.includes('Timeless')) return 'casual';
  return 'casual';
};

const mapMeetingPriority = (value) => {
  if (!value) return undefined;
  if (value.includes('connection')) return 'friendship';
  if (value.includes('values')) return 'networking';
  if (value.includes('Learning')) return 'networking';
  if (value.includes('Fun')) return 'friendship';
  return 'friendship';
};

const mapRelationshipStatus = (value) => {
  if (!value) return 'single';
  if (value.includes('Single')) return 'single';
  if (value.includes('Married')) return 'married';
  if (value.includes('relationship')) return 'committed';
  if (value.includes('complicated')) return 'single';
  return 'single';
};

const mapSpending = (value) => {
  if (!value) return 800;
  if (value.includes('500 - 1000')) return 750;
  if (value.includes('1000 - 1500')) return 1250;
  if (value.includes('More than 1500')) return 1600;
  return 800;
};

const calculateAge = (birthYear) => {
  if (!birthYear) return undefined;
  // Parse date format like "6/14/1993"
  const parts = birthYear.split('/');
  if (parts.length === 3) {
    const year = parseInt(parts[2]);
    return 2025 - year;
  }
  return undefined;
};

// Convert CSV to JSON
const guests = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;

  const values = parseCSVLine(line);

  // Extract data (0-indexed)
  const city = values[0];
  const dinnerVibeRaw = values[3];
  const talkTopicRaw = values[4];
  const groupDynamicRaw = values[5];
  const humorTypeRaw = values[6];
  const wardrobeStyleRaw = values[7];
  const introvert = values[8];
  const aloneTime = values[9];
  const family = values[10];
  const spirituality = values[11];
  const humor = values[12];
  const meetingPriorityRaw = values[13];
  const dietary = values[14];
  const frequency = values[15];
  const spendingRaw = values[16];
  const genderRaw = values[17];
  const relationshipRaw = values[18];
  const hasChildrenRaw = values[19];
  const country = values[20];
  const birthYear = values[21];
  const firstName = values[22];
  const lastName = values[23];
  const email = values[24];
  const countryCode = values[25];
  const phoneNumber = values[26];

  // Skip if missing essential data
  if (!firstName || !lastName || firstName.includes('First Name')) {
    continue;
  }

  // Skip if outside Addis Ababa or incomplete
  if (city?.includes('Outside') || !dinnerVibeRaw) {
    console.log(`Skipping ${firstName} ${lastName} - outside city or incomplete`);
    continue;
  }

  const age = calculateAge(birthYear);
  const phone = countryCode && phoneNumber ? `${countryCode}${phoneNumber}` : undefined;

  const guest = {
    name: `${firstName} ${lastName}`.trim(),
    first_name: firstName,
    last_name: lastName,
    email: email || undefined,
    phone: phone,
    gender: genderRaw?.toLowerCase(),
    age: age,
    tags: [],
    dietaryNotes: dietary && dietary !== 'None' ? dietary : undefined,

    personality: {
      dinnerVibe: mapDinnerVibe(dinnerVibeRaw),
      talkTopic: mapTalkTopic(talkTopicRaw),
      groupDynamic: mapGroupDynamic(groupDynamicRaw),
      humorType: mapHumorType(humorTypeRaw),
      wardrobeStyle: mapWardrobeStyle(wardrobeStyleRaw),
      introvertScale: parseInt(introvert) || 5,
      aloneTimeScale: parseInt(aloneTime) || 5,
      familyScale: parseInt(family) || 5,
      spiritualityScale: parseInt(spirituality) || 5,
      humorScale: parseInt(humor) || 5,
      meetingPriority: mapMeetingPriority(meetingPriorityRaw),
      spending: mapSpending(spendingRaw),
      relationshipStatus: mapRelationshipStatus(relationshipRaw),
      hasChildren: hasChildrenRaw?.toLowerCase().includes('yes')
    }
  };

  guests.push(guest);
}

// Save to JSON
const outputPath = path.join(__dirname, 'guests-to-upload.json');
fs.writeFileSync(outputPath, JSON.stringify(guests, null, 2));

console.log(`\n✅ Converted ${guests.length} guests from CSV to JSON`);
console.log(`📄 Saved to: ${outputPath}`);
console.log(`\n📋 Sample guests:`);
console.log(JSON.stringify(guests.slice(0, 2), null, 2));
