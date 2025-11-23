import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
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

  const getGuestById = (guestId: string) => guests.find(g => g.id === guestId);

  return (
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
  );
};