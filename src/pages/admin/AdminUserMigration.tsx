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

    // Helper to parse CSV line handling quotes
    const parseLine = (line: string): string[] => {
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      fields.push(current.trim().replace(/^"|"$/g, ''));
      return fields;
    };

    if (lines.length < 2) return [];

    // Parse headers to find indices
    const headers = parseLine(lines[0].toLowerCase());

    const findIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

    // Core fields
    const emailIdx = findIdx(['email', 'e-mail']);
    const firstNameIdx = findIdx(['first name', 'firstname', 'given name']);
    const lastNameIdx = findIdx(['last name', 'lastname', 'surname', 'family name']);
    // Fallback if split names not found, look for "Full Name"
    const fullNameIdx = findIdx(['full name', 'name', 'fullname']);

    const genderIdx = findIdx(['gender', 'sex']);
    const birthYearIdx = findIdx(['birth', 'dob', 'age', 'year']);
    const phoneIdx = findIdx(['phone', 'mobile', 'cell', 'contact']);
    const countryCodeIdx = findIdx(['country code', 'code']);

    // Extended profile fields (try to match keywords)
    const cityPreferenceIdx = findIdx(['city', 'location']);
    const mealPreferenceIdx = findIdx(['meal', 'lunch', 'dinner']);
    const dietIdx = findIdx(['diet', 'food preference']);
    const restaurantFreqIdx = findIdx(['frequency', 'often']);
    const spendingIdx = findIdx(['spending', 'budget']);
    const relationshipIdx = findIdx(['relationship', 'marital']);
    const childrenIdx = findIdx(['children', 'kids']);
    const countryIdx = findIdx(['country', 'origin']);

    // Personality fields (mapped by specific question keywords from the survey)
    const dinnerVibeIdx = findIdx(['vibe', 'describe']);
    const talkTopicIdx = findIdx(['talk', 'topic']);
    const groupDynamicIdx = findIdx(['dynamic', 'group']);
    const humorTypeIdx = findIdx(['humor type', 'kind of humor']);
    const wardrobeStyleIdx = findIdx(['wardrobe', 'style']);

    const introvertScaleIdx = findIdx(['introvert', 'extrovert']);
    const aloneTimeScaleIdx = findIdx(['alone time', 'social battery']);
    const familyScaleIdx = findIdx(['family', 'close']);
    const spiritualityScaleIdx = findIdx(['spirituality', 'faith']);
    const humorScaleIdx = findIdx(['funny', 'crack a joke']);
    const meetingPriorityIdx = findIdx(['meeting new', 'priority']);

    const parsedUsers: ParsedUser[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const fields = parseLine(line);

      // Get core data
      let firstName = firstNameIdx >= 0 ? fields[firstNameIdx] : '';
      let lastName = lastNameIdx >= 0 ? fields[lastNameIdx] : '';

      // Handle Full Name fallback if split names missing
      if ((!firstName || !lastName) && fullNameIdx >= 0) {
        const full = fields[fullNameIdx].trim();
        const parts = full.split(' ');
        if (parts.length > 1) {
          firstName = parts[0];
          lastName = parts.slice(1).join(' ');
        } else {
          firstName = full;
          lastName = 'Unknown';
        }
      }

      const email = emailIdx >= 0 ? fields[emailIdx]?.trim().toLowerCase() : '';
      const genderRaw = genderIdx >= 0 ? fields[genderIdx]?.trim() : 'prefer_not_to_say';
      const birthYearRaw = birthYearIdx >= 0 ? fields[birthYearIdx]?.trim() : '2000';

      // Skip if missing essential data
      if (!email) continue;
      if (!firstName) firstName = 'User';
      if (!lastName) lastName = 'Imported';

      // Normalize gender
      let gender = genderRaw.toLowerCase();
      if (gender.includes('f') || gender.includes('wom')) gender = 'female';
      else if (gender.includes('m') || gender.includes('man')) gender = 'male';
      else if (gender.includes('non') || gender.includes('bi')) gender = 'non_binary';
      else gender = 'prefer_not_to_say';

      // Calculate Age
      const currentYear = new Date().getFullYear();
      let age = 25;
      try {
        if (birthYearRaw.match(/^\d{4}$/)) { // Just year
          age = currentYear - parseInt(birthYearRaw);
        } else {
          const date = new Date(birthYearRaw);
          if (!isNaN(date.getTime())) {
            age = currentYear - date.getFullYear();
          }
        }
      } catch (e) { age = 25; }

      // Map personality
      const personality: any = {};

      // Helper to map field content to enum
      const mapField = (idx: number, mappings: Record<string, string>) => {
        if (idx < 0) return undefined;
        const val = fields[idx]?.toLowerCase() || '';
        for (const [key, result] of Object.entries(mappings)) {
          if (val.includes(key)) return result;
        }
        return undefined;
      };

      personality.dinnerVibe = mapField(dinnerVibeIdx, {
        'steering': 'steering', 'lead': 'steering',
        'sharing': 'sharing', 'stories': 'sharing',
        'observe': 'observing', 'listen': 'observing',
        'adapt': 'adapting', 'flow': 'adapting'
      });

      personality.talkTopic = mapField(talkTopicIdx, {
        'current': 'current_events', 'world': 'current_events',
        'art': 'arts_entertainment', 'entertainment': 'arts_entertainment',
        'growth': 'personal_growth', 'phil': 'personal_growth',
        'food': 'food_travel', 'travel': 'food_travel',
        'hobb': 'hobbies'
      });

      personality.groupDynamic = mapField(groupDynamicIdx, {
        'diverse': 'diverse', 'different': 'diverse',
        'shared': 'similar', 'similar': 'similar'
      });

      personality.humorType = mapField(humorTypeIdx, {
        'sarcastic': 'sarcastic',
        'playful': 'playful', 'light': 'playful',
        'wit': 'witty', 'clever': 'witty',
        'not': 'not_a_fan'
      });

      personality.wardrobeStyle = mapField(wardrobeStyleIdx, {
        'timeless': 'timeless', 'classic': 'timeless',
        'bold': 'bold', 'trend': 'bold'
      });

      // Scales
      personality.introvertScale = introvertScaleIdx >= 0 ? (parseInt(fields[introvertScaleIdx]) || 3) : 3;
      personality.aloneTimeScale = aloneTimeScaleIdx >= 0 ? (parseInt(fields[aloneTimeScaleIdx]) || 3) : 3;
      personality.familyScale = familyScaleIdx >= 0 ? (parseInt(fields[familyScaleIdx]) || 3) : 3;
      personality.spiritualityScale = spiritualityScaleIdx >= 0 ? (parseInt(fields[spiritualityScaleIdx]) || 3) : 3;
      personality.humorScale = humorScaleIdx >= 0 ? (parseInt(fields[humorScaleIdx]) || 3) : 3;

      personality.meetingPriority = mapField(meetingPriorityIdx, {
        'value': 'values',
        'fun': 'fun',
        'learn': 'learning',
        'connect': 'connection'
      });

      // Other fields
      const countryCode = countryCodeIdx >= 0 ? fields[countryCodeIdx]?.trim() : '251';
      const phone = phoneIdx >= 0 ? fields[phoneIdx]?.replace(/\s+/g, '') : undefined;

      const diet = dietIdx >= 0 ? fields[dietIdx]?.trim() : undefined;
      const spending = spendingIdx >= 0 ? fields[spendingIdx]?.trim() : undefined;

      parsedUsers.push({
        firstName, lastName, email, gender,
        birthYear: birthYearRaw, age,
        countryCode, phone,
        personality,
        diet, spending,
        // ... include other optional fields if indices > 0
        country: countryIdx >= 0 ? fields[countryIdx] : undefined,
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
                Select a CSV file containing user data to migrate. The system will attempt to auto-match columns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12">
                <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Choose a CSV file</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports CSV exports with standard headers (Email, Name, Phone, etc.)
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
