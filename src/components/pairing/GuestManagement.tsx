import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Upload, Search, X } from "lucide-react";
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
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  tags: string[];
  dietary_notes: string | null;
  gender: string | null;
  age_range: string | null;
  friend_group: string | null;
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
      const { error } = await supabase.from("pairing_guests").insert({
        event_id: eventId,
        first_name: newGuest.first_name.trim(),
        last_name: newGuest.last_name.trim(),
        phone: newGuest.phone.trim() || null,
        email: newGuest.email.trim() || null,
        tags: newGuest.tags ? newGuest.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        dietary_notes: newGuest.dietary_notes.trim() || null,
        gender: newGuest.gender || null,
        age_range: newGuest.age_range.trim() || null,
        friend_group: newGuest.friend_group.trim() || null,
      });

      if (error) throw error;

      toast.success("Guest added successfully");
      setIsAddDialogOpen(false);
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
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to add guest");
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
        const guest: any = { event_id: eventId };
        
        headers.forEach((header, index) => {
          const value = values[index];
          if (header === "tags") {
            guest.tags = value ? value.split("|").map(t => t.trim()) : [];
          } else if (value) {
            guest[header] = value;
          }
        });
        
        return guest;
      });

      const { error } = await supabase.from("pairing_guests").insert(guestsToImport);

      if (error) throw error;

      toast.success(`Imported ${guestsToImport.length} guests successfully`);
      setIsImportDialogOpen(false);
      setCsvData("");
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to import guests");
    }
  };

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = searchQuery === "" || 
      guest.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
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
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Guest
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredGuests.map(guest => (
          <Card key={guest.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-2">
                {guest.first_name} {guest.last_name}
              </h3>
              {guest.email && (
                <p className="text-sm text-muted-foreground mb-1">{guest.email}</p>
              )}
              {guest.phone && (
                <p className="text-sm text-muted-foreground mb-2">{guest.phone}</p>
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
              {guest.dietary_notes && (
                <p className="text-xs text-muted-foreground mt-2">
                  Dietary: {guest.dietary_notes}
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
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Guest</DialogTitle>
            <DialogDescription>Enter guest information</DialogDescription>
          </DialogHeader>
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
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddGuest}>Add Guest</Button>
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