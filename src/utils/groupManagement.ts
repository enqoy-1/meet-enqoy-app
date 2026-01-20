// Utility functions for managing pairing groups

export interface ParticipantCategory {
  userId: string;
  category: string;
  age?: number;
  gender?: string;
  budget?: string;
  name?: string;
  email?: string;
}

export interface Group {
  id: string;
  isManual?: boolean;
  participants: ParticipantCategory[];
  categoryDistribution: Record<string, number>;
  genderDistribution: { male: number; female: number; other: number };
  averageAge: number;
  budget: string;
  compatibilityScore: number;
  name?: string;
  aiAnalysis?: string;
  conversationStarters?: string[];
  createdAt: string;
  modifiedAt?: string;
}

export interface StoredGroupsData {
  groups: Group[];
  version: number;
  lastModified: string;
  eventId: string;
}

/**
 * Generate a unique ID for a group
 */
export function generateGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an empty manual group
 */
export function createManualGroup(name?: string): Group {
  return {
    id: generateGroupId(),
    isManual: true,
    participants: [],
    categoryDistribution: {},
    genderDistribution: { male: 0, female: 0, other: 0 },
    averageAge: 0,
    budget: '',
    compatibilityScore: 0,
    name: name || `Manual Group ${new Date().toLocaleTimeString()}`,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Calculate category distribution for a group
 */
export function calculateCategoryDistribution(participants: ParticipantCategory[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  participants.forEach(p => {
    if (p.category) {
      distribution[p.category] = (distribution[p.category] || 0) + 1;
    }
  });
  return distribution;
}

/**
 * Calculate gender distribution for a group
 */
export function calculateGenderDistribution(participants: ParticipantCategory[]): { male: number; female: number; other: number } {
  const distribution = { male: 0, female: 0, other: 0 };
  participants.forEach(p => {
    if (p.gender === 'male') distribution.male++;
    else if (p.gender === 'female') distribution.female++;
    else if (p.gender) distribution.other++;
  });
  return distribution;
}

/**
 * Calculate average age for a group
 */
export function calculateAverageAge(participants: ParticipantCategory[]): number {
  const ages = participants.filter(p => p.age).map(p => p.age!);
  if (ages.length === 0) return 0;
  return Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length);
}

/**
 * Convert numeric budget to range string
 */
function normalizeBudget(budget: string | number | undefined): string {
  if (!budget) return '';
  
  // Handle numeric values
  const numValue = typeof budget === 'number' ? budget : parseFloat(String(budget));
  if (!isNaN(numValue)) {
    if (numValue < 500) return '<500';
    if (numValue < 1000) return '500-1000';
    if (numValue < 1500) return '1000-1500';
    return '1500+';
  }
  
  // Already a range string
  return String(budget);
}

/**
 * Determine the dominant budget for a group
 */
export function calculateDominantBudget(participants: ParticipantCategory[]): string {
  const budgets = participants
    .filter(p => p.budget)
    .map(p => normalizeBudget(p.budget));
  
  if (budgets.length === 0) return '';

  // Count budget occurrences (normalized to ranges)
  const budgetCounts: Record<string, number> = {};
  budgets.forEach(b => {
    if (b) budgetCounts[b] = (budgetCounts[b] || 0) + 1;
  });

  // Return the most common budget range
  const entries = Object.entries(budgetCounts);
  if (entries.length === 0) return '';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Recalculate compatibility score based on group composition
 */
export function recalculateCompatibilityScore(group: Group): number {
  if (group.participants.length === 0) return 0;

  let score = 100;

  // Age compatibility (-20 if age spread > 5 years)
  const ages = group.participants.filter(p => p.age).map(p => p.age!);
  if (ages.length > 1) {
    const ageSpread = Math.max(...ages) - Math.min(...ages);
    if (ageSpread > 5) score -= 20;
    else if (ageSpread > 3) score -= 10;
  }

  // Budget compatibility (-30 if mixed budgets)
  const budgets = new Set(group.participants.map(p => p.budget).filter(Boolean));
  if (budgets.size > 1) score -= 30;

  // Gender balance (-15 if severely imbalanced)
  if (group.participants.length >= 4) {
    const total = group.participants.length;
    const ratio = Math.abs(
      group.genderDistribution.male - group.genderDistribution.female
    ) / total;
    if (ratio > 0.6) score -= 15;
  }

  // Personality diversity (+10 if 3+ categories, -10 if all same)
  const categoryCount = Object.values(group.categoryDistribution)
    .filter(count => count > 0).length;
  if (categoryCount >= 3) score += 10;
  else if (categoryCount === 1 && group.participants.length > 1) score -= 10;

  // Size penalty (groups should ideally be 5-7 people)
  if (group.participants.length < 4) score -= 20;
  else if (group.participants.length > 8) score -= 15;

  return Math.max(0, Math.min(100, score));
}

/**
 * Recalculate all metrics for a group after participants change
 */
export function recalculateGroupMetrics(group: Group): Group {
  return {
    ...group,
    categoryDistribution: calculateCategoryDistribution(group.participants),
    genderDistribution: calculateGenderDistribution(group.participants),
    averageAge: calculateAverageAge(group.participants),
    budget: calculateDominantBudget(group.participants),
    compatibilityScore: recalculateCompatibilityScore({
      ...group,
      categoryDistribution: calculateCategoryDistribution(group.participants),
      genderDistribution: calculateGenderDistribution(group.participants),
    }),
    modifiedAt: new Date().toISOString(),
  };
}

/**
 * Validate group composition and return warnings
 */
export function validateGroupComposition(group: Group): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (group.participants.length === 0) {
    warnings.push('Group is empty');
  }

  if (group.participants.length < 4) {
    warnings.push('Group has fewer than 4 participants');
  }

  if (group.participants.length > 8) {
    warnings.push('Group has more than 8 participants');
  }

  // Check gender balance
  const total = group.participants.length;
  if (total >= 4) {
    const maleRatio = group.genderDistribution.male / total;
    const femaleRatio = group.genderDistribution.female / total;
    if (maleRatio > 0.7 || femaleRatio > 0.7) {
      warnings.push('Gender distribution is imbalanced');
    }
  }

  // Check age spread
  const ages = group.participants.filter(p => p.age).map(p => p.age!);
  if (ages.length > 1) {
    const ageSpread = Math.max(...ages) - Math.min(...ages);
    if (ageSpread > 10) {
      warnings.push(`Age spread is ${ageSpread} years`);
    }
  }

  // Check budget mix
  const budgets = new Set(group.participants.map(p => p.budget).filter(Boolean));
  if (budgets.size > 1) {
    warnings.push('Mixed budget preferences');
  }

  return {
    valid: warnings.length === 0 || (warnings.length === 1 && warnings[0].includes('fewer than 4')),
    warnings,
  };
}

/**
 * Add participant to a group
 */
export function addParticipantToGroup(participant: ParticipantCategory, group: Group): Group {
  const newGroup = {
    ...group,
    participants: [...group.participants, participant],
  };
  return recalculateGroupMetrics(newGroup);
}

/**
 * Remove participant from a group by index
 */
export function removeParticipantFromGroup(participantIndex: number, group: Group): Group {
  const newGroup = {
    ...group,
    participants: group.participants.filter((_, i) => i !== participantIndex),
  };
  return recalculateGroupMetrics(newGroup);
}

/**
 * Move participant from one group to another
 */
export function moveParticipantBetweenGroups(
  fromGroupIndex: number,
  toGroupIndex: number,
  participantIndex: number,
  groups: Group[]
): Group[] {
  const newGroups = [...groups];
  const participant = newGroups[fromGroupIndex].participants[participantIndex];

  // Remove from source group
  newGroups[fromGroupIndex] = removeParticipantFromGroup(participantIndex, newGroups[fromGroupIndex]);

  // Add to destination group
  newGroups[toGroupIndex] = addParticipantToGroup(participant, newGroups[toGroupIndex]);

  return newGroups;
}

/**
 * Migrate old localStorage format to new versioned format
 */
export function migrateGroupsData(oldData: any, eventId: string): StoredGroupsData {
  // If old format (just array of groups)
  if (Array.isArray(oldData)) {
    return {
      groups: oldData.map((g, i) => ({
        ...g,
        id: g.id || generateGroupId(),
        isManual: g.isManual || false,
        createdAt: g.createdAt || new Date().toISOString(),
      })),
      version: 1,
      lastModified: new Date().toISOString(),
      eventId,
    };
  }

  // Already new format or invalid
  if (oldData && typeof oldData === 'object' && 'groups' in oldData) {
    return oldData;
  }

  // Invalid data, return empty
  return {
    groups: [],
    version: 1,
    lastModified: new Date().toISOString(),
    eventId,
  };
}

/**
 * Save groups to localStorage with versioning
 */
export function saveGroupsToLocalStorage(eventId: string, groups: Group[]): void {
  const data: StoredGroupsData = {
    groups,
    version: 1,
    lastModified: new Date().toISOString(),
    eventId,
  };
  localStorage.setItem(`generated-groups-${eventId}`, JSON.stringify(data));
}

/**
 * Load groups from localStorage with migration
 */
export function loadGroupsFromLocalStorage(eventId: string): Group[] {
  const stored = localStorage.getItem(`generated-groups-${eventId}`);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    const migrated = migrateGroupsData(parsed, eventId);
    return migrated.groups;
  } catch (error) {
    console.error('Failed to load groups from localStorage:', error);
    return [];
  }
}

/**
 * Get all participants from all groups
 */
export function getAllParticipants(groups: Group[]): ParticipantCategory[] {
  return groups.flatMap(g => g.participants);
}

/**
 * Find unassigned participants (guests not in any group)
 */
export function findUnassignedParticipants(
  allGuests: any[],
  groups: Group[]
): ParticipantCategory[] {
  const assignedUserIds = new Set(getAllParticipants(groups).map(p => p.userId));

  return allGuests
    .filter(guest => !assignedUserIds.has(guest.id) && !assignedUserIds.has(guest.userId))
    .map(guest => ({
      userId: guest.id || guest.userId,
      category: guest.personality?.personality || 'Unknown',
      age: guest.age || guest.personality?.age,
      gender: guest.gender || guest.personality?.gender,
      budget: guest.personality?.spending,
      name: guest.name,
      email: guest.email,
    }));
}
