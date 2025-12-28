import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Upload, AlertCircle, CheckCircle, XCircle, Loader2, FileUp } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface ParsedUser {
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  birthYear: string;
  age: number;
  phone?: string;
  countryCode?: string;
  personality: any;
  // New fields
  diet?: string;
  spending?: string;
  restaurantFrequency?: string;
  relationshipStatus?: string;
  hasChildren?: boolean;
  country?: string;
  cityPreference?: string;
  mealPreference?: string;
  funFacts?: string[];
}

interface MigrationResult {
  email: string;
  name: string;
  status: 'pending' | 'success' | 'error' | 'skipped';
  error?: string;
  password?: string; // Temporary password for successfully created users
}

export default function AdminUserMigration() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<ParsedUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [migrationResults, setMigrationResults] = useState<MigrationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const parseCSV = (text: string): ParsedUser[] => {
    const lines = text.split('\n');
    const headers = lines[0].split(',');

    // Find column indices (0-based for JavaScript arrays)
    const firstNameIdx = 22;  // Column 23: [What is your full name?] First Name
    const lastNameIdx = 23;   // Column 24: [What is your full name?] Last Name
    const emailIdx = 24;      // Column 25: What is your email?
    const genderIdx = 17;     // Column 18: Gender
    const birthYearIdx = 21;  // Column 22: What year were you born?
    const countryCodeIdx = 25; // Column 26: [What is your phone number?] Country Code
    const phoneIdx = 26;      // Column 27: [What is your phone number?] Phone

    // New column indices
    const cityPreferenceIdx = 0;  // Column 0: Which city would you like to attend
    const outsideCityIdx = 1;     // Column 1: City if outside Addis
    const mealPreferenceIdx = 2;  // Column 2: Lunch or dinner preference
    const dietIdx = 14;           // Column 14: Dietary preferences
    const restaurantFreqIdx = 15; // Column 15: Restaurant frequency
    const spendingIdx = 16;       // Column 16: Spending preference
    const relationshipIdx = 18;   // Column 18: Relationship status
    const childrenIdx = 19;       // Column 19: Do you have children?
    const countryIdx = 20;        // Column 20: Country of origin
    const funFact1Idx = 27;       // Column 27: Fun fact 1
    const funFact2Idx = 28;       // Column 28: Fun fact 2

    const parsedUsers: ParsedUser[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Parse CSV line (handle quoted fields)
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      fields.push(current.trim());

      const firstName = fields[firstNameIdx]?.trim();
      const lastName = fields[lastNameIdx]?.trim();
      const email = fields[emailIdx]?.trim().toLowerCase();
      const genderRaw = fields[genderIdx]?.trim();
      const birthYearRaw = fields[birthYearIdx]?.trim();

      // Skip if missing essential data
      if (!firstName || !lastName || !email || !genderRaw || !birthYearRaw) {
        continue;
      }

      // Normalize gender to match enum: male, female, non_binary, prefer_not_to_say
      let gender = genderRaw.toLowerCase();
      if (gender === 'f' || gender === 'female') gender = 'female';
      else if (gender === 'm' || gender === 'male') gender = 'male';
      else if (gender === 'non-binary' || gender === 'non_binary') gender = 'non_binary';
      else gender = 'prefer_not_to_say';

      // Parse birth year correctly - CSV has dates like "6/14/1993"
      const currentYear = new Date().getFullYear();
      let age: number;

      try {
        // Try parsing as a full date first
        const birthDate = new Date(birthYearRaw);
        if (!isNaN(birthDate.getTime())) {
          age = currentYear - birthDate.getFullYear();
        } else {
          // Fallback: try as just a year
          const yearMatch = birthYearRaw.match(/\d{4}/);
          age = yearMatch ? currentYear - parseInt(yearMatch[0]) : 25; // default to 25 if can't parse
        }
      } catch {
        age = 25; // default age if parsing fails
      }

      // Validate age is reasonable
      if (age < 18 || age > 100) {
        console.warn(`Skipping ${email}: invalid age ${age} from birthYear ${birthYearRaw}`);
        continue;
      }

      // Map CSV columns to personality assessment format
      const personality: any = {};

      // Column 3: dinnerVibe - "Which statement best describes your vibe at dinner?"
      const dinnerVibeRaw = fields[3]?.toLowerCase() || '';
      if (dinnerVibeRaw.includes('steering') || dinnerVibeRaw.includes('lead')) {
        personality.dinnerVibe = 'steering';
      } else if (dinnerVibeRaw.includes('sharing') || dinnerVibeRaw.includes('stories')) {
        personality.dinnerVibe = 'sharing';
      } else if (dinnerVibeRaw.includes('observe') || dinnerVibeRaw.includes('listen')) {
        personality.dinnerVibe = 'observing';
      } else if (dinnerVibeRaw.includes('adapt') || dinnerVibeRaw.includes('flow')) {
        personality.dinnerVibe = 'adapting';
      }

      // Column 4: talkTopic - "If you could talk about one topic all night"
      const talkTopicRaw = fields[4]?.toLowerCase() || '';
      if (talkTopicRaw.includes('current events') || talkTopicRaw.includes('world issues')) {
        personality.talkTopic = 'current_events';
      } else if (talkTopicRaw.includes('arts') || talkTopicRaw.includes('entertainment')) {
        personality.talkTopic = 'arts_entertainment';
      } else if (talkTopicRaw.includes('personal growth') || talkTopicRaw.includes('philosophy')) {
        personality.talkTopic = 'personal_growth';
      } else if (talkTopicRaw.includes('food') || talkTopicRaw.includes('travel')) {
        personality.talkTopic = 'food_travel';
      } else if (talkTopicRaw.includes('hobbies')) {
        personality.talkTopic = 'hobbies';
      }

      // Column 5: groupDynamic - "What does your ideal group dynamic look like?"
      const groupDynamicRaw = fields[5]?.toLowerCase() || '';
      if (groupDynamicRaw.includes('diverse') || groupDynamicRaw.includes('different viewpoints')) {
        personality.groupDynamic = 'diverse';
      } else if (groupDynamicRaw.includes('shared') || groupDynamicRaw.includes('similar')) {
        personality.groupDynamic = 'similar';
      }

      // Column 6: humorType - "What kind of humor do you enjoy?"
      const humorTypeRaw = fields[6]?.toLowerCase() || '';
      if (humorTypeRaw.includes('sarcastic')) {
        personality.humorType = 'sarcastic';
      } else if (humorTypeRaw.includes('playful') || humorTypeRaw.includes('lighthearted')) {
        personality.humorType = 'playful';
      } else if (humorTypeRaw.includes('witty') || humorTypeRaw.includes('clever')) {
        personality.humorType = 'witty';
      } else if (humorTypeRaw.includes('not') || humorTypeRaw.includes('none')) {
        personality.humorType = 'not_a_fan';
      }

      // Column 7: wardrobeStyle - "If your personality were a wardrobe"
      const wardrobeStyleRaw = fields[7]?.toLowerCase() || '';
      if (wardrobeStyleRaw.includes('timeless') || wardrobeStyleRaw.includes('classics')) {
        personality.wardrobeStyle = 'timeless';
      } else if (wardrobeStyleRaw.includes('bold') || wardrobeStyleRaw.includes('trendy')) {
        personality.wardrobeStyle = 'bold';
      }

      // Columns 8-12: Scale questions (1-5)
      personality.introvertScale = parseInt(fields[8]) || 3;
      personality.aloneTimeScale = parseInt(fields[9]) || 3;
      personality.familyScale = parseInt(fields[10]) || 3;
      personality.spiritualityScale = parseInt(fields[11]) || 3;
      personality.humorScale = parseInt(fields[12]) || 3;

      // Column 13: meetingPriority - "What's most important when meeting new people?"
      const meetingPriorityRaw = fields[13]?.toLowerCase() || '';
      if (meetingPriorityRaw.includes('shared values') || meetingPriorityRaw.includes('interests')) {
        personality.meetingPriority = 'values';
      } else if (meetingPriorityRaw.includes('fun') || meetingPriorityRaw.includes('engaging')) {
        personality.meetingPriority = 'fun';
      } else if (meetingPriorityRaw.includes('learning')) {
        personality.meetingPriority = 'learning';
      } else if (meetingPriorityRaw.includes('connection')) {
        personality.meetingPriority = 'connection';
      }

      // Clean phone number - remove spaces and non-digits except leading +
      const countryCode = fields[countryCodeIdx]?.trim() || '251';
      const phoneRaw = fields[phoneIdx]?.trim() || '';
      const phone = phoneRaw.replace(/\s+/g, ''); // Remove all spaces

      // Parse new fields
      const cityPreference = fields[cityPreferenceIdx]?.trim() || 'Addis Ababa';
      const outsideCity = fields[outsideCityIdx]?.trim();
      const city = cityPreference.toLowerCase().includes('outside') ? outsideCity : cityPreference;

      const mealPreferenceRaw = fields[mealPreferenceIdx]?.toLowerCase() || '';
      const mealPreference = mealPreferenceRaw.includes('lunch') ? 'lunch' : mealPreferenceRaw.includes('dinner') ? 'dinner' : undefined;

      const diet = fields[dietIdx]?.trim() || undefined;
      const restaurantFrequency = fields[restaurantFreqIdx]?.trim() || undefined;
      const spending = fields[spendingIdx]?.trim() || undefined;
      const relationshipStatus = fields[relationshipIdx]?.trim() || undefined;

      const childrenRaw = fields[childrenIdx]?.toLowerCase()?.trim() || '';
      const hasChildren = childrenRaw === 'yes' ? true : childrenRaw === 'no' ? false : undefined;

      const country = fields[countryIdx]?.trim() || undefined;

      // Fun facts
      const funFact1 = fields[funFact1Idx]?.trim();
      const funFact2 = fields[funFact2Idx]?.trim();
      const funFacts = [funFact1, funFact2].filter(f => f && f.length > 0);

      parsedUsers.push({
        firstName,
        lastName,
        email,
        gender,
        birthYear: birthYearRaw,
        age,
        countryCode,
        phone,
        personality,
        // New fields
        diet,
        spending,
        restaurantFrequency,
        relationshipStatus,
        hasChildren,
        country,
        cityPreference: city,
        mealPreference,
        funFacts: funFacts.length > 0 ? funFacts : undefined,
      });
    }

    return parsedUsers;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsedUsers = parseCSV(text);

        setUsers(parsedUsers);
        setMigrationResults(parsedUsers.map(u => ({
          email: u.email,
          name: `${u.firstName} ${u.lastName}`,
          status: 'pending',
        })));
        setSelectedUsers(new Set(parsedUsers.map(u => u.email)));

        toast.success(`Loaded ${parsedUsers.length} users from CSV`);
      } catch (error) {
        console.error('CSV parsing error:', error);
        toast.error('Failed to parse CSV file');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  const toggleUser = (email: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedUsers(newSelected);
  };

  const toggleAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.email)));
    }
  };

  const migrateUsers = async () => {
    if (selectedUsers.size === 0) {
      toast.error("No users selected");
      return;
    }

    if (!window.confirm(`Create ${selectedUsers.size} user account${selectedUsers.size > 1 ? 's' : ''}?`)) {
      return;
    }

    setIsMigrating(true);
    setMigrationProgress(0);

    const usersToMigrate = users.filter(u => selectedUsers.has(u.email));
    const results: MigrationResult[] = [];
    let completed = 0;

    for (const user of usersToMigrate) {
      try {
        console.log(`Processing ${completed + 1}/${usersToMigrate.length}: ${user.email}`);

        // Create user directly via backend - use special constant for legacy users
        // This allows us to detect them later when they try to login
        const password = 'LEGACY_NO_PASSWORD';

        const response = await fetch('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            email: user.email,
            password,
            firstName: user.firstName,
            lastName: user.lastName,
            gender: user.gender,
            age: user.age,
            phone: user.phone,
            countryCode: user.countryCode,
            personality: user.personality,
            isLegacyImport: true,
            // New fields
            diet: user.diet,
            spending: user.spending,
            restaurantFrequency: user.restaurantFrequency,
            relationshipStatus: user.relationshipStatus,
            hasChildren: user.hasChildren,
            country: user.country,
            city: user.cityPreference,
            mealPreference: user.mealPreference,
            funFacts: user.funFacts,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(errorData.message || 'Failed to create user');
        }

        console.log(`✅ Success: ${user.email} (Legacy user - no password set)`);
        results.push({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          status: 'success',
          password: undefined, // No password to export - user will set their own
        });
      } catch (error: any) {
        console.error(`❌ Failed: ${user.email}`, error);
        results.push({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          status: 'error',
          error: error.message,
        });
      }

      completed++;
      setMigrationProgress((completed / usersToMigrate.length) * 100);

      // Small delay to avoid overwhelming the backend
      if (completed < usersToMigrate.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update results in real-time
      setMigrationResults(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(r => r.email === user.email);
        if (idx !== -1) {
          updated[idx] = results[results.length - 1];
        }
        return updated;
      });
    }

    setMigrationResults(results);
    setIsMigrating(false);

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log('\n===== MIGRATION SUMMARY =====');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log('============================\n');

    // Group errors by type
    if (errorCount > 0) {
      const errorsByType: Record<string, number> = {};
      results.filter(r => r.status === 'error').forEach(r => {
        const errorMsg = r.error || 'Unknown error';
        errorsByType[errorMsg] = (errorsByType[errorMsg] || 0) + 1;
      });

      console.log('Error breakdown:');
      Object.entries(errorsByType).forEach(([error, count]) => {
        console.log(`  - ${error}: ${count} users`);
      });
    }

    if (successCount > 0) {
      toast.success(`Successfully created ${successCount} user account${successCount > 1 ? 's' : ''}`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to create ${errorCount} user account${errorCount > 1 ? 's' : ''}`);
    }
  };

  const exportResults = () => {
    const successfulMigrations = migrationResults.filter(r => r.status === 'success' && r.password);

    if (successfulMigrations.length === 0) {
      toast.error('No successful migrations to export');
      return;
    }

    // Create CSV content
    const csvHeader = 'Name,Email,Temporary Password\n';
    const csvRows = successfulMigrations.map(r =>
      `"${r.name}","${r.email}","${r.password}"`
    ).join('\n');
    const csvContent = csvHeader + csvRows;

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migrated-users-credentials-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success(`Exported credentials for ${successfulMigrations.length} users`);
  };

  const filteredUsers = users.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCount = selectedUsers.size;
  const successCount = migrationResults.filter(r => r.status === 'success').length;
  const errorCount = migrationResults.filter(r => r.status === 'error').length;

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
          <div>
            <h1 className="text-3xl font-bold">User Migration</h1>
            <p className="text-muted-foreground">Import legacy users from CSV file</p>
          </div>
        </div>

        {/* File Upload */}
        {users.length === 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select a CSV file containing user data from the Enqoy Test form
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12">
                <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Choose a CSV file</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports Enqoy Test - Sheet1.csv format
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="max-w-xs"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {users.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Selected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{selectedCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Created
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{successCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Errors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                </CardContent>
              </Card>
            </div>

            {/* Migration Controls */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User List</CardTitle>
                    <CardDescription>
                      Select users to create accounts for
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUsers([]);
                        setSelectedUsers(new Set());
                        setMigrationResults([]);
                      }}
                      disabled={isMigrating}
                    >
                      Clear & Upload New
                    </Button>
                    <Button
                      onClick={migrateUsers}
                      disabled={selectedCount === 0 || isMigrating}
                    >
                      {isMigrating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Create {selectedCount} Account{selectedCount !== 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                    {successCount > 0 && (
                      <Button
                        variant="outline"
                        onClick={exportResults}
                        disabled={isMigrating}
                      >
                        📥 Export Credentials ({successCount})
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Select All */}
                <div className="flex gap-4 mb-4">
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={toggleAll} disabled={isMigrating}>
                    {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                {/* Progress Bar */}
                {isMigrating && (
                  <div className="mb-4">
                    <Progress value={migrationProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      {Math.round(migrationProgress)}% Complete
                    </p>
                  </div>
                )}

                {/* User List */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No users match your search' : 'No users found'}
                    </div>
                  ) : (
                    filteredUsers.map(user => {
                      const result = migrationResults.find(r => r.email === user.email);

                      return (
                        <div
                          key={user.email}
                          className={`flex items-center gap-3 p-3 border rounded-lg ${result?.status === 'success' ? 'bg-green-50 border-green-200' :
                            result?.status === 'error' ? 'bg-red-50 border-red-200' :
                              'hover:bg-gray-50'
                            }`}
                        >
                          <Checkbox
                            checked={selectedUsers.has(user.email)}
                            onCheckedChange={() => toggleUser(user.email)}
                            disabled={isMigrating || result?.status === 'success'}
                          />

                          <div className="flex-1">
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{user.gender}</Badge>
                            <Badge variant="outline">{user.age} years</Badge>
                            {user.personality && Object.keys(user.personality).length > 0 && (
                              <Badge variant="secondary">Has Assessment</Badge>
                            )}
                          </div>

                          {result && (
                            <div className="ml-2">
                              {result.status === 'success' && (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              )}
                              {result.status === 'error' && (
                                <div className="flex items-center gap-2 max-w-xs">
                                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                                  <span className="text-sm text-red-600 truncate" title={result.error}>
                                    {result.error}
                                  </span>
                                </div>
                              )}
                              {result.status === 'pending' && isMigrating && (
                                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Error Details */}
            {errorCount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    Migration Errors ({errorCount})
                  </CardTitle>
                  <CardDescription>Review errors and take corrective action</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {migrationResults
                      .filter(r => r.status === 'error')
                      .map(result => (
                        <div key={result.email} className="p-3 border border-red-200 rounded bg-red-50">
                          <div className="font-medium">{result.name}</div>
                          <div className="text-sm text-muted-foreground">{result.email}</div>
                          <div className="text-sm text-red-600 mt-1">{result.error}</div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
