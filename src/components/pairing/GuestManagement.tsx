import { useState, useRef, useEffect } from "react";
import { pairingApi, usersApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Upload, Search, X, FileUp, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const guestSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100, "First name must be less than 100 characters"),
  last_name: z.string().trim().min(1, "Last name is required").max(100, "Last name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal("")),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional().or(z.literal("")),
  tags: z.string().max(500, "Tags must be less than 500 characters").optional().or(z.literal("")),
  dietary_notes: z.string().trim().max(500, "Dietary notes must be less than 500 characters").optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  age_range: z.string().trim().max(20, "Age range must be less than 20 characters").optional().or(z.literal("")),
  friend_group: z.string().trim().max(100, "Friend group must be less than 100 characters").optional().or(z.literal("")),
});

interface Guest {
  id: string;
  name: string;
  email: string | null;
  tags: string[];
  dietaryNotes: string | null;
  gender: string | null;
  age: number | null;
  user?: {
    profile?: {
      phone?: string | null;
    };
  } | null;
}

interface GuestManagementProps {
  eventId: string;
  guests: Guest[];
  onRefresh: () => void;
}

export const GuestManagement = ({ eventId, guests, onRefresh }: GuestManagementProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [newGuest, setNewGuest] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    tags: "",
    dietary_notes: "",
    gender: "",
    age_range: "",
    friend_group: "",
  });
  const [csvData, setCsvData] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // User search states
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Search for users when search query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (userSearchQuery.trim().length < 2) {
        setUserSearchResults([]);
        setShowUserDropdown(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await usersApi.search(userSearchQuery);
        setUserSearchResults(results);
        setShowUserDropdown(true);
      } catch (error) {
        console.error("Failed to search users:", error);
        setUserSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [userSearchQuery]);

  // Handle user selection from search results
  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setShowUserDropdown(false);
    setUserSearchQuery("");

    // Auto-populate form with user data
    const nameParts = user.fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    setNewGuest({
      first_name: firstName,
      last_name: lastName,
      phone: user.phone || "",
      email: user.email || "",
      gender: user.gender || "",
      age_range: user.age ? String(user.age) : "",
      tags: "",
      dietary_notes: "",
      friend_group: "",
    });

    toast.success(`Selected ${user.fullName} - form auto-filled`);
  };

  // Reset search when dialog closes
  const handleDialogClose = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setUserSearchQuery("");
      setUserSearchResults([]);
      setShowUserDropdown(false);
      setSelectedUser(null);
      setValidationErrors({});
      setNewGuest({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        tags: "",
        dietary_notes: "",
        gender: "",
        age_range: "",
        friend_group: "",
      });
    }
  };

  // Handle CSV file upload
  const handleCSVFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');

      if (lines.length < 2) {
        toast.error("CSV file is empty or has no data");
        return;
      }

      // Map CSV fields to personality data
      const mapDinnerVibe = (value: string) => {
        if (!value) return undefined;
        if (value.includes('steering')) return 'steering';
        if (value.includes('sharing')) return 'sharing';
        if (value.includes('observe')) return 'observing';
        if (value.includes('adapt')) return 'adapting';
        return undefined;
      };

      const mapTalkTopic = (value: string) => {
        if (!value) return undefined;
        if (value.includes('Current events')) return 'current_events';
        if (value.includes('Arts')) return 'arts_entertainment';
        if (value.includes('Personal growth')) return 'personal_growth';
        if (value.includes('Food, travel')) return 'food_travel';
        if (value.includes('Hobbies')) return 'hobbies';
        return undefined;
      };

      const mapGroupDynamic = (value: string) => {
        if (!value) return undefined;
        if (value.includes('similar')) return 'similar';
        if (value.includes('diverse')) return 'diverse';
        return undefined;
      };

      const parseCSVLine = (line: string) => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              current += '"';
              i++;
            } else {
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
      };

      const guestsData = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);

        // Extract based on your CSV structure (adjust column indices as needed)
        const firstName = values[22];
        const lastName = values[23];
        const email = values[24];
        const gender = values[17]?.toLowerCase();
        const birthYear = values[21];

        if (!firstName || !lastName || firstName.includes('First Name')) continue;

        const calculateAge = (year: string) => {
          const parts = year?.split('/');
          if (parts && parts.length === 3) {
            return 2025 - parseInt(parts[2]);
          }
          return undefined;
        };

        const guest = {
          eventId: eventId,
          name: `${firstName} ${lastName}`.trim(),
          email: email || undefined,
          gender: gender || undefined,
          age: calculateAge(birthYear),
          tags: [],
          dietaryNotes: values[14] && values[14] !== 'None' ? values[14] : undefined,
          personality: {
            dinnerVibe: mapDinnerVibe(values[3]),
            talkTopic: mapTalkTopic(values[4]),
            groupDynamic: mapGroupDynamic(values[5]),
            humorType: values[6]?.includes('Clever') ? 'witty' : values[6]?.includes('Playful') ? 'playful' : 'dry',
            wardrobeStyle: values[7]?.includes('Bold') ? 'trendy' : 'casual',
            introvertScale: parseInt(values[8]) || 5,
            aloneTimeScale: parseInt(values[9]) || 5,
            familyScale: parseInt(values[10]) || 5,
            spiritualityScale: parseInt(values[11]) || 5,
            humorScale: parseInt(values[12]) || 5,
            meetingPriority: values[13]?.includes('connection') ? 'friendship' : 'networking',
            spending: values[16]?.includes('500 - 1000') ? 750 : values[16]?.includes('1000 - 1500') ? 1250 : 800,
            relationshipStatus: values[18]?.includes('Married') ? 'married' : values[18]?.includes('relationship') ? 'committed' : 'single',
            hasChildren: values[19]?.toLowerCase().includes('yes')
          }
        };

        guestsData.push(guest);
      }

      // Import guests
      let successCount = 0;
      for (const guest of guestsData) {
        try {
          await pairingApi.createGuest(guest);
          successCount++;
        } catch (error) {
          console.error("Failed to import guest:", guest, error);
        }
      }

      toast.success(`Imported ${successCount} out of ${guestsData.length} guests from CSV`);
      onRefresh();

      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = "";
      }
    } catch (error: any) {
      toast.error("Failed to parse CSV file");
      console.error("CSV parse error:", error);
    }
  };

  // Handle JSON file upload with personality assessment data
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Support both array and single object
      const guestsData = Array.isArray(data) ? data : [data];

      let successCount = 0;
      for (const guest of guestsData) {
        try {
          // Map fields to PairingGuest schema
          const guestPayload: any = {
            eventId: eventId,
            name: guest.name || `${guest.first_name || ''} ${guest.last_name || ''}`.trim(),
            email: guest.email || undefined,
            gender: guest.gender || undefined,
            age: guest.age || (guest.age_range ? parseInt(guest.age_range) : undefined),
            tags: guest.tags || [],
            dietaryNotes: guest.dietary_notes || guest.dietaryNotes || undefined,
          };

          // Include personality assessment data if present
          if (guest.personality || guest.assessment) {
            guestPayload.personality = guest.personality || guest.assessment;
          }

          // If individual assessment fields are present, build personality object
          if (guest.talkTopic || guest.dinnerVibe || guest.groupDynamic) {
            guestPayload.personality = {
              talkTopic: guest.talkTopic,
              groupDynamic: guest.groupDynamic,
              dinnerVibe: guest.dinnerVibe,
              humorType: guest.humorType,
              wardrobeStyle: guest.wardrobeStyle,
              introvertScale: guest.introvertScale,
              aloneTimeScale: guest.aloneTimeScale,
              familyScale: guest.familyScale,
              spiritualityScale: guest.spiritualityScale,
              humorScale: guest.humorScale,
              meetingPriority: guest.meetingPriority,
              spending: guest.spending || guest.budget,
              relationshipStatus: guest.relationshipStatus,
              hasChildren: guest.hasChildren,
            };
          }

          await pairingApi.createGuest(guestPayload);
          successCount++;
        } catch (error) {
          console.error("Failed to import guest:", guest, error);
        }
      }

      toast.success(`Imported ${successCount} out of ${guestsData.length} guests with personality data`);
      onRefresh();

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      toast.error("Failed to parse file. Ensure it's valid JSON.");
      console.error("File parse error:", error);
    }
  };

  const handleAddGuest = async () => {
    // Validate input
    try {
      guestSchema.parse(newGuest);
      setValidationErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
        toast.error("Please fix validation errors");
        return;
      }
    }

    try {
      const fullName = `${newGuest.first_name.trim()} ${newGuest.last_name.trim()}`;
      const tags = newGuest.tags ? newGuest.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

      const guestData: any = {
        eventId: eventId,
        name: fullName,
        email: newGuest.email.trim() || undefined,
        gender: newGuest.gender || undefined,
        tags: tags,
        dietaryNotes: newGuest.dietary_notes.trim() || undefined,
        age: newGuest.age_range ? parseInt(newGuest.age_range) : undefined,
      };

      // If user was selected from search, link the guest to that user and include personality data
      if (selectedUser) {
        guestData.userId = selectedUser.id;
        if (selectedUser.personality) {
          guestData.personality = selectedUser.personality;
        }
      }

      await pairingApi.createGuest(guestData);

      toast.success(selectedUser
        ? `Guest added and linked to ${selectedUser.fullName}`
        : "Guest added successfully");

      handleDialogClose(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add guest");
    }
  };


  const handleImportCSV = async () => {
    if (!csvData.trim()) {
      toast.error("Please paste CSV data");
      return;
    }

    try {
      const lines = csvData.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.trim());

      const guestsToImport = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        const guestData: any = {};

        headers.forEach((header, index) => {
          const value = values[index];
          if (header === "first_name" && value) {
            guestData.first_name = value;
          } else if (header === "last_name" && value) {
            guestData.last_name = value;
          } else if (header === "email" && value) {
            guestData.email = value;
          } else if (header === "gender" && value) {
            guestData.gender = value;
          } else if (header === "tags" && value) {
            guestData.tags = value.split("|").map(t => t.trim()).filter(Boolean);
          } else if (header === "dietary_notes" && value) {
            guestData.dietaryNotes = value;
          } else if (header === "age_range" && value) {
            guestData.age = parseInt(value);
          }
        });

        // Combine first and last name
        const fullName = `${guestData.first_name || ''} ${guestData.last_name || ''}`.trim();

        return {
          eventId: eventId,
          name: fullName,
          email: guestData.email || undefined,
          gender: guestData.gender || undefined,
          tags: guestData.tags || [],
          dietaryNotes: guestData.dietaryNotes || undefined,
          age: guestData.age || undefined,
        };
      });

      // Import guests one by one
      let successCount = 0;
      for (const guest of guestsToImport) {
        try {
          await pairingApi.createGuest(guest);
          successCount++;
        } catch (error) {
          console.error("Failed to import guest:", guest, error);
        }
      }

      toast.success(`Imported ${successCount} out of ${guestsToImport.length} guests successfully`);
      setIsImportDialogOpen(false);
      setCsvData("");
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to import guests");
    }
  };

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = searchQuery === "" ||
      guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.user?.profile?.phone?.includes(searchQuery);

    const matchesTag = filterTag === "all" || guest.tags.includes(filterTag);

    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(new Set(guests.flatMap(g => g.tags)));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => csvFileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV/Excel
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <FileUp className="h-4 w-4 mr-2" />
            Upload JSON
          </Button>
          <input
            type="file"
            ref={csvFileInputRef}
            accept=".csv,.xlsx,.xls"
            onChange={handleCSVFileUpload}
            className="hidden"
          />
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Guest
          </Button>
          {guests.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!window.confirm("Create user accounts for all guests without users? This will create new user accounts.")) {
                    return;
                  }
                  try {
                    const result = await pairingApi.createUsersFromGuests(eventId);
                    if (result.created > 0) {
                      toast.success(`Created ${result.created} new user account${result.created > 1 ? 's' : ''} from guests`);
                      onRefresh();
                    } else {
                      toast.info("No new users needed");
                    }
                    if (result.skipped > 0) {
                      toast.info(`Skipped ${result.skipped} guests (already have users)`);
                    }
                    if (result.errors && result.errors.length > 0) {
                      console.error("Errors creating users:", result.errors);
                    }
                  } catch (error) {
                    toast.error("Failed to create users from guests");
                  }
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                Create Users from Guests
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (window.confirm(`Delete all ${guests.length} guests? This cannot be undone!`)) {
                    try {
                      await pairingApi.deleteAllGuests(eventId);
                      toast.success("All guests deleted");
                      onRefresh();
                    } catch (error) {
                      toast.error("Failed to delete guests");
                    }
                  }
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Guests
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredGuests.map(guest => (
          <Card key={guest.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-2">
                {guest.name}
              </h3>
              {guest.email && (
                <p className="text-sm text-muted-foreground mb-1">{guest.email}</p>
              )}
              {guest.age && (
                <p className="text-sm text-muted-foreground mb-2">Age: {guest.age}</p>
              )}
              {guest.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {guest.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {guest.dietaryNotes && (
                <p className="text-xs text-muted-foreground mt-2">
                  Dietary: {guest.dietaryNotes}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGuests.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No guests found</p>
          </CardContent>
        </Card>
      )}

      {/* Add Guest Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Guest</DialogTitle>
            <DialogDescription>
              {selectedUser
                ? `Adding guest from user: ${selectedUser.fullName}`
                : "Search for an existing user or enter guest information manually"}
            </DialogDescription>
          </DialogHeader>

          {/* User Search Field */}
          <div className="space-y-2 mb-4 border-b pb-4">
            <Label htmlFor="userSearch">Search for Existing User (by email or phone)</Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="userSearch"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Type email or phone number..."
                  className="pl-10"
                  disabled={!!selectedUser}
                />
              </div>
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              )}

              {/* Selected User Badge */}
              {selectedUser && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    {selectedUser.fullName} ({selectedUser.email})
                    {selectedUser.assessmentCompleted && (
                      <span className="text-xs text-green-600">✓ Assessment</span>
                    )}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(null);
                      setNewGuest({
                        first_name: "",
                        last_name: "",
                        phone: "",
                        email: "",
                        tags: "",
                        dietary_notes: "",
                        gender: "",
                        age_range: "",
                        friend_group: "",
                      });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Search Results Dropdown */}
              {showUserDropdown && userSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                  {userSearchResults.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 hover:bg-muted cursor-pointer border-b last:border-0"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="font-medium">{user.fullName}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                        {user.phone && ` • ${user.phone}`}
                      </div>
                      <div className="flex gap-2 mt-1">
                        {user.age && <Badge variant="outline" className="text-xs">{user.age}y</Badge>}
                        {user.gender && <Badge variant="outline" className="text-xs capitalize">{user.gender}</Badge>}
                        {user.assessmentCompleted && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            Assessment Complete
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showUserDropdown && userSearchResults.length === 0 && !isSearching && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 p-3 text-sm text-muted-foreground">
                  No users found matching "{userSearchQuery}"
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={newGuest.first_name}
                onChange={(e) => {
                  setNewGuest({ ...newGuest, first_name: e.target.value });
                  if (validationErrors.first_name) {
                    setValidationErrors({ ...validationErrors, first_name: "" });
                  }
                }}
                className={validationErrors.first_name ? "border-destructive" : ""}
              />
              {validationErrors.first_name && (
                <p className="text-xs text-destructive">{validationErrors.first_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={newGuest.last_name}
                onChange={(e) => {
                  setNewGuest({ ...newGuest, last_name: e.target.value });
                  if (validationErrors.last_name) {
                    setValidationErrors({ ...validationErrors, last_name: "" });
                  }
                }}
                className={validationErrors.last_name ? "border-destructive" : ""}
              />
              {validationErrors.last_name && (
                <p className="text-xs text-destructive">{validationErrors.last_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newGuest.email}
                onChange={(e) => {
                  setNewGuest({ ...newGuest, email: e.target.value });
                  if (validationErrors.email) {
                    setValidationErrors({ ...validationErrors, email: "" });
                  }
                }}
                className={validationErrors.email ? "border-destructive" : ""}
              />
              {validationErrors.email && (
                <p className="text-xs text-destructive">{validationErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newGuest.phone}
                onChange={(e) => {
                  setNewGuest({ ...newGuest, phone: e.target.value });
                  if (validationErrors.phone) {
                    setValidationErrors({ ...validationErrors, phone: "" });
                  }
                }}
                className={validationErrors.phone ? "border-destructive" : ""}
              />
              {validationErrors.phone && (
                <p className="text-xs text-destructive">{validationErrors.phone}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={newGuest.gender} onValueChange={(value) => setNewGuest({ ...newGuest, gender: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-binary</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="age_range">Age Range</Label>
              <Input
                id="age_range"
                value={newGuest.age_range}
                onChange={(e) => setNewGuest({ ...newGuest, age_range: e.target.value })}
                placeholder="e.g., 25-35"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={newGuest.tags}
                onChange={(e) => {
                  setNewGuest({ ...newGuest, tags: e.target.value });
                  if (validationErrors.tags) {
                    setValidationErrors({ ...validationErrors, tags: "" });
                  }
                }}
                placeholder="vip, first-timer"
                className={validationErrors.tags ? "border-destructive" : ""}
              />
              {validationErrors.tags && (
                <p className="text-xs text-destructive">{validationErrors.tags}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="friend_group">Friend Group</Label>
              <Input
                id="friend_group"
                value={newGuest.friend_group}
                onChange={(e) => {
                  setNewGuest({ ...newGuest, friend_group: e.target.value });
                  if (validationErrors.friend_group) {
                    setValidationErrors({ ...validationErrors, friend_group: "" });
                  }
                }}
                className={validationErrors.friend_group ? "border-destructive" : ""}
              />
              {validationErrors.friend_group && (
                <p className="text-xs text-destructive">{validationErrors.friend_group}</p>
              )}
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="dietary_notes">Dietary Notes</Label>
              <Textarea
                id="dietary_notes"
                value={newGuest.dietary_notes}
                onChange={(e) => {
                  setNewGuest({ ...newGuest, dietary_notes: e.target.value });
                  if (validationErrors.dietary_notes) {
                    setValidationErrors({ ...validationErrors, dietary_notes: "" });
                  }
                }}
                placeholder="Allergies, preferences, etc."
                className={validationErrors.dietary_notes ? "border-destructive" : ""}
              />
              {validationErrors.dietary_notes && (
                <p className="text-xs text-destructive">{validationErrors.dietary_notes}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddGuest}>
              {selectedUser ? "Add Guest from User" : "Add Guest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Guests from CSV</DialogTitle>
            <DialogDescription>
              Paste CSV data with headers: first_name, last_name, phone, email, tags, dietary_notes, gender, age_range, friend_group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="first_name,last_name,email,phone,tags,dietary_notes,gender,age_range,friend_group&#10;John,Doe,john@example.com,+251912345678,vip|first-timer,Vegetarian,male,25-35,Group A"
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Note: Separate multiple tags with | (pipe character)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportCSV}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};