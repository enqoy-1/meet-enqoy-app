import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Upload, Search, X } from "lucide-react";
import { toast } from "sonner";
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
    if (!newGuest.first_name || !newGuest.last_name) {
      toast.error("First and last name are required");
      return;
    }

    try {
      const { error } = await supabase.from("pairing_guests").insert({
        event_id: eventId,
        first_name: newGuest.first_name,
        last_name: newGuest.last_name,
        phone: newGuest.phone || null,
        email: newGuest.email || null,
        tags: newGuest.tags ? newGuest.tags.split(",").map(t => t.trim()) : [],
        dietary_notes: newGuest.dietary_notes || null,
        gender: newGuest.gender || null,
        age_range: newGuest.age_range || null,
        friend_group: newGuest.friend_group || null,
      });

      if (error) throw error;

      toast.success("Guest added successfully");
      setIsAddDialogOpen(false);
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
        <div className="flex gap-2">
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
                onChange={(e) => setNewGuest({ ...newGuest, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={newGuest.last_name}
                onChange={(e) => setNewGuest({ ...newGuest, last_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newGuest.email}
                onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newGuest.phone}
                onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
              />
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
                onChange={(e) => setNewGuest({ ...newGuest, tags: e.target.value })}
                placeholder="vip, first-timer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="friend_group">Friend Group</Label>
              <Input
                id="friend_group"
                value={newGuest.friend_group}
                onChange={(e) => setNewGuest({ ...newGuest, friend_group: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="dietary_notes">Dietary Notes</Label>
              <Textarea
                id="dietary_notes"
                value={newGuest.dietary_notes}
                onChange={(e) => setNewGuest({ ...newGuest, dietary_notes: e.target.value })}
                placeholder="Allergies, preferences, etc."
              />
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