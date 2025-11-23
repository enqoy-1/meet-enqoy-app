import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, AlertCircle, Check, Upload } from "lucide-react";
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

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  tags: string[];
  dietary_notes: string | null;
}

interface Table {
  id: string;
  name: string;
  capacity: number;
}

interface Restaurant {
  id: string;
  name: string;
  capacity_total: number;
  tables: Table[];
}

interface Assignment {
  id: string;
  guest_id: string;
  restaurant_id: string | null;
  table_id: string | null;
  seat_number: number | null;
}

interface PairingBoardProps {
  eventId: string;
  guests: Guest[];
  restaurants: Restaurant[];
  assignments: Assignment[];
  onRefresh: () => void;
}

export const PairingBoard = ({ eventId, guests, restaurants, assignments, onRefresh }: PairingBoardProps) => {
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string>("all");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const assignedGuestIds = new Set(assignments.map(a => a.guest_id));
  const unassignedGuests = guests.filter(g => !assignedGuestIds.has(g.id));

  const filteredUnassigned = unassignedGuests.filter(guest => 
    filterTag === "all" || guest.tags.includes(filterTag)
  );

  const allTags = Array.from(new Set(guests.flatMap(g => g.tags)));

  const handleAssignGuest = async (guestId: string, restaurantId: string, tableId: string) => {
    try {
      // Check table capacity
      const table = restaurants
        .find(r => r.id === restaurantId)
        ?.tables.find(t => t.id === tableId);
      
      const currentSeated = assignments.filter(a => a.table_id === tableId).length;
      
      if (table && currentSeated >= table.capacity) {
        toast.error(`Table ${table.name} is at full capacity (${table.capacity} seats)`);
        return;
      }

      // Check if guest already assigned
      const existing = assignments.find(a => a.guest_id === guestId);
      
      if (existing) {
        // Update assignment
        const { error } = await supabase
          .from("pairing_assignments")
          .update({
            restaurant_id: restaurantId,
            table_id: tableId,
            seat_number: currentSeated + 1,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new assignment
        const { error } = await supabase.from("pairing_assignments").insert({
          event_id: eventId,
          guest_id: guestId,
          restaurant_id: restaurantId,
          table_id: tableId,
          seat_number: currentSeated + 1,
          status: "assigned",
        });

        if (error) throw error;
      }

      // Log to audit
      await supabase.from("pairing_audit_log").insert({
        event_id: eventId,
        action: "assign_guest",
        details: { guest_id: guestId, restaurant_id: restaurantId, table_id: tableId },
      });

      toast.success("Guest assigned successfully");
      setSelectedGuest(null);
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to assign guest");
    }
  };

  const handleUnassignGuest = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("pairing_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast.success("Guest unassigned");
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to unassign guest");
    }
  };

  const handleImportCSV = async () => {
    if (!csvData.trim()) {
      toast.error("Please paste CSV data");
      return;
    }

    setIsImporting(true);
    try {
      const lines = csvData.trim().split("\n");
      const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
      
      // Expected columns: first_name, last_name, email, restaurant_name, table_name
      const requiredHeaders = ["first_name", "last_name", "restaurant_name", "table_name"];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(", ")}`);
        return;
      }

      const assignments: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(",").map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        // Find guest by name and/or email
        let guest = guests.find(g => 
          g.first_name.toLowerCase() === row.first_name?.toLowerCase() &&
          g.last_name.toLowerCase() === row.last_name?.toLowerCase()
        );

        if (!guest && row.email) {
          guest = guests.find(g => g.email?.toLowerCase() === row.email.toLowerCase());
        }

        if (!guest) {
          errors.push(`Row ${i + 1}: Guest not found - ${row.first_name} ${row.last_name}`);
          continue;
        }

        // Find restaurant by name
        const restaurant = restaurants.find(r => 
          r.name.toLowerCase() === row.restaurant_name?.toLowerCase()
        );

        if (!restaurant) {
          errors.push(`Row ${i + 1}: Restaurant not found - ${row.restaurant_name}`);
          continue;
        }

        // Find table by name within restaurant
        const table = restaurant.tables.find(t => 
          t.name.toLowerCase() === row.table_name?.toLowerCase()
        );

        if (!table) {
          errors.push(`Row ${i + 1}: Table not found - ${row.table_name} in ${restaurant.name}`);
          continue;
        }

        // Check table capacity
        const currentSeated = assignments.filter(a => a.table_id === table.id).length;
        if (currentSeated >= table.capacity) {
          errors.push(`Row ${i + 1}: Table ${table.name} is at capacity`);
          continue;
        }

        assignments.push({
          event_id: eventId,
          guest_id: guest.id,
          restaurant_id: restaurant.id,
          table_id: table.id,
          seat_number: currentSeated + 1,
          status: "assigned",
        });
      }

      if (assignments.length === 0) {
        toast.error("No valid assignments found in CSV");
        if (errors.length > 0) {
          console.error("Import errors:", errors);
          toast.error(`Found ${errors.length} errors. Check console for details.`);
        }
        return;
      }

      // Delete existing assignments for guests being reassigned
      const guestIds = assignments.map(a => a.guest_id);
      await supabase
        .from("pairing_assignments")
        .delete()
        .in("guest_id", guestIds)
        .eq("event_id", eventId);

      // Insert new assignments
      const { error: insertError } = await supabase
        .from("pairing_assignments")
        .insert(assignments);

      if (insertError) throw insertError;

      // Log to audit
      await supabase.from("pairing_audit_log").insert({
        event_id: eventId,
        action: "import_assignments",
        details: { count: assignments.length, errors: errors.length },
      });

      toast.success(`Imported ${assignments.length} assignment${assignments.length > 1 ? 's' : ''} successfully`);
      if (errors.length > 0) {
        toast.warning(`${errors.length} rows had errors. Check console for details.`);
        console.warn("Import errors:", errors);
      }

      setIsImportDialogOpen(false);
      setCsvData("");
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to import assignments");
      console.error("Import error:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const getGuestById = (guestId: string) => guests.find(g => g.id === guestId);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Pairing Board</h2>
        <Button onClick={() => setIsImportDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import Assignments
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
      {/* Unassigned Guests Sidebar */}
      <div className="col-span-3">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-base">Unassigned Guests</CardTitle>
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredUnassigned.map(guest => (
                  <div
                    key={guest.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedGuest === guest.id
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedGuest(guest.id)}
                  >
                    <p className="font-medium text-sm">
                      {guest.first_name} {guest.last_name}
                    </p>
                    {guest.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {guest.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {guest.dietary_notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {guest.dietary_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {filteredUnassigned.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No unassigned guests
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Restaurant & Table Columns */}
      <div className="col-span-9">
        <div className="grid grid-cols-2 gap-4">
          {restaurants.map(restaurant => {
            const restaurantAssignments = assignments.filter(a => a.restaurant_id === restaurant.id);
            const totalSeated = restaurantAssignments.length;
            
            return (
              <Card key={restaurant.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{restaurant.name}</CardTitle>
                    <Badge variant={totalSeated >= restaurant.capacity_total ? "destructive" : "secondary"}>
                      {totalSeated}/{restaurant.capacity_total}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {restaurant.tables.map(table => {
                        const tableAssignments = assignments.filter(a => a.table_id === table.id);
                        const tableGuests = tableAssignments.map(a => getGuestById(a.guest_id)).filter(Boolean);
                        const isAtCapacity = tableAssignments.length >= table.capacity;

                        return (
                          <div key={table.id} className="border rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold text-sm">{table.name}</h4>
                              <Badge variant={isAtCapacity ? "destructive" : "outline"} className="text-xs">
                                {tableAssignments.length}/{table.capacity}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2">
                              {tableGuests.map((guest, index) => {
                                if (!guest) return null;
                                const assignment = tableAssignments[index];
                                
                                return (
                                  <div
                                    key={guest.id}
                                    className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                                  >
                                    <span>
                                      {guest.first_name} {guest.last_name}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUnassignGuest(assignment.id)}
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>

                            {selectedGuest && !isAtCapacity && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full mt-2"
                                onClick={() => handleAssignGuest(selectedGuest, restaurant.id, table.id)}
                              >
                                <Check className="h-3 w-3 mr-2" />
                                Assign Here
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {restaurants.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Restaurants Added</h3>
              <p className="text-muted-foreground">
                Add restaurants and tables first to start assigning guests
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      </div>

      {/* Import CSV Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Pairing Assignments</DialogTitle>
            <DialogDescription>
              Paste CSV data with columns: first_name, last_name, email (optional), restaurant_name, table_name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="csv-data">CSV Data</Label>
              <Textarea
                id="csv-data"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="first_name,last_name,email,restaurant_name,table_name&#10;John,Doe,john@example.com,Restaurant A,Table 1&#10;Jane,Smith,jane@example.com,Restaurant A,Table 2"
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
              <p className="font-medium">Format Requirements:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>First row must contain column headers</li>
                <li>Required columns: first_name, last_name, restaurant_name, table_name</li>
                <li>Optional: email (helps match guests more accurately)</li>
                <li>Guest names must match existing guests exactly</li>
                <li>Restaurant and table names must match existing entries</li>
                <li>Any existing assignments for these guests will be replaced</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsImportDialogOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button onClick={handleImportCSV} disabled={isImporting}>
              {isImporting ? "Importing..." : "Import Assignments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};