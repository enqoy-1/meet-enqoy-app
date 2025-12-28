import { useState, useEffect } from "react";
import { pairingApi } from "@/api";
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
  userId?: string;
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
  capacity: number;
  tables: Table[];
}

interface Assignment {
  id: string;
  guestId: string;
  restaurantId: string | null;
  tableId: string | null;
  seatNumber: number | null;
  groupName?: string;
}

interface Group {
  participants: any[];
  categoryDistribution: Record<string, number>;
  genderDistribution: { male: number; female: number; other: number };
  averageAge: number;
  budget: string;
  compatibilityScore: number;
  name?: string;
  aiAnalysis?: string;
}

interface PairingBoardProps {
  eventId: string;
  guests: Guest[];
  restaurants: Restaurant[];
  assignments: Assignment[];
  onRefresh: () => void;
  generatedGroups?: Group[];
  onGroupAssigned?: (index: number) => void;
}

export const PairingBoard = ({ eventId, guests, restaurants, assignments, onRefresh, generatedGroups = [], onGroupAssigned }: PairingBoardProps) => {
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [filterTag, setFilterTag] = useState<string>("all");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [draggedGroup, setDraggedGroup] = useState<number | null>(null);
  const [assignedGroupIndices, setAssignedGroupIndices] = useState<Set<number>>(new Set());

  const assignedGuestIds = new Set(assignments.map(a => a.guestId));
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

      const currentSeated = assignments.filter(a => a.tableId === tableId).length;

      if (table && currentSeated >= table.capacity) {
        toast.error(`Table ${table.name} is at full capacity (${table.capacity} seats)`);
        return;
      }

      // Check if guest already assigned
      const existing = assignments.find(a => a.guestId === guestId);

      if (existing) {
        // Update assignment
        await pairingApi.updateAssignment(existing.id, {
          tableId: tableId,
          seatNumber: currentSeated + 1,
        });
      } else {
        // Create new assignment
        await pairingApi.createAssignment({
          guestId: guestId,
          tableId: tableId,
          seatNumber: currentSeated + 1,
        });
      }

      // Log to audit
      await pairingApi.createAuditLog({
        action: "assign_guest",
        entityType: "assignment",
        entityId: guestId,
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
      await pairingApi.deleteAssignment(assignmentId);

      toast.success("Guest unassigned");
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to unassign guest");
    }
  };

  const handleAssignGroupToRestaurant = async (groupIndex: number, restaurantId: string) => {
    console.log('🎯 handleAssignGroupToRestaurant called:', { groupIndex, restaurantId });
    try {
      const group = generatedGroups[groupIndex];
      console.log('Found group:', group);
      if (!group) {
        console.log('❌ No group found at index', groupIndex);
        toast.error("Group not found");
        return;
      }

      const restaurant = restaurants.find(r => r.id === restaurantId);
      if (!restaurant) {
        toast.error("Restaurant not found");
        return;
      }

      // Check if restaurant has enough capacity
      const currentSeated = assignments.filter(a => a.restaurantId === restaurantId).length;
      const availableSeats = restaurant.capacity - currentSeated;

      // Removed warning as requested: "no limit on how many groups"
      console.log(`Assigning group to ${restaurant.name}. Capacity: ${restaurant.capacity}, Current: ${currentSeated}, Group: ${group.participants.length}`);

      // Find guest IDs for the participants in this group
      console.log('🔍 Sample participant (all fields):', JSON.stringify(group.participants[0], null, 2));
      console.log('🔍 Sample guest (all fields):', JSON.stringify(guests[0], null, 2));

      const participantUserIds = group.participants.map(p => p.userId);
      console.log('👥 Participant userIds from group:', participantUserIds);
      console.log('📋 Total guests available:', guests.length);

      const groupGuestIds = guests
        .filter(g => participantUserIds.includes(g.userId) || participantUserIds.includes(g.id))
        .map(g => g.id);

      console.log('✅ Matched guest IDs:', groupGuestIds.length, '/', participantUserIds.length);

      if (groupGuestIds.length === 0) {
        console.error('❌ No guests matched!');
        // Fallback debug: print first few guests
        console.log('First 3 guests:', guests.slice(0, 3));
        toast.error("Could not find guests for this group. Make sure guests are imported.");
        return;
      }

      if (groupGuestIds.length < participantUserIds.length) {
        console.warn(`⚠️ Only matched ${groupGuestIds.length} out of ${participantUserIds.length} participants`);
      }

      // Assign all participants in the group to the restaurant
      console.log(`🔄 Starting assignment of ${groupGuestIds.length} guests to ${restaurant.name}...`);

      for (const guestId of groupGuestIds) {
        // Check if guest already has an assignment
        const existing = assignments.find(a => a.guestId === guestId);

        if (existing) {
          console.log(`📝 Updating existing assignment for guest ${guestId}`);
          // Update assignment
          await pairingApi.updateAssignment(existing.id, {
            restaurantId: restaurantId,
            tableId: null,
            seatNumber: null,
          });
          // Note: updateAssignment might not support groupName update unless we add it to API.
          // Ideally we delete and recreate or add groupName to update endpoint.
          // For now, new assignments get groupName.
        } else {
          console.log(`➕ Creating new assignment for guest ${guestId}`);
          // Create new assignment with Group Name
          await pairingApi.createAssignment({
            guestId: guestId,
            restaurantId: restaurantId,
            tableId: null,
            seatNumber: null,
            groupName: group.name || `Group ${groupIndex + 1}`,
          });
        }
      }

      console.log(`✅ Successfully assigned ${groupGuestIds.length} guests!`);
      toast.success(`Assigned ${groupGuestIds.length} participants from Group ${groupIndex + 1} to ${restaurant.name}`);

      // Mark group as assigned locally (for PairingBoard display)
      setAssignedGroupIndices(prev => new Set(prev).add(groupIndex));

      // Notify parent that group was assigned (Groups tab will mark as assigned but keep visible)
      if (onGroupAssigned) {
        onGroupAssigned(groupIndex);
      }

      setSelectedGroup(null);
      onRefresh();
    } catch (error: any) {
      console.error("Group assignment error:", error);
      toast.error("Failed to assign group");
    }
  };

  const handleDragStart = (e: React.DragEvent, groupIndex: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', groupIndex.toString());
    setDraggedGroup(groupIndex);
    console.log('Drag started for group:', groupIndex);
  };

  const handleDragEnd = () => {
    setDraggedGroup(null);
    console.log('Drag ended');
  };

  const handleDrop = (e: React.DragEvent, restaurantId: string, tableId: string) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('🎉 DROP EVENT FIRED!', { restaurantId, tableId });

    const groupIndex = e.dataTransfer.getData('text/plain');
    console.log('Retrieved group index from dataTransfer:', groupIndex);

    if (groupIndex !== '') {
      const index = parseInt(groupIndex, 10);
      console.log('✅ Dropped group', index, 'on table', tableId);
      // Assignment to table not implemented in this snippet, using generic assignment
      // Assuming we modify logic or use existing
      toast.info("Group drop on table is not fully implemented yet, select group and click restaurant.");
    } else {
      console.error('❌ No group index found in dataTransfer');
    }

    setDraggedGroup(null);

    // Remove visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove('bg-primary/10', 'border-primary');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    console.log('🎯 Dragging over drop zone');
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('bg-primary/10', 'border-primary');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('👋 Left drop zone');
    // Remove visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove('bg-primary/10', 'border-primary');
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

      const newAssignments: any[] = [];
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
        const currentSeated = newAssignments.filter(a => a.tableId === table.id).length;
        if (currentSeated >= table.capacity) {
          errors.push(`Row ${i + 1}: Table ${table.name} is at capacity`);
          continue;
        }

        newAssignments.push({
          guestId: guest.id,
          tableId: table.id,
          seatNumber: currentSeated + 1,
        });
      }

      if (newAssignments.length === 0) {
        toast.error("No valid assignments found in CSV");
        if (errors.length > 0) {
          console.error("Import errors:", errors);
          toast.error(`Found ${errors.length} errors. Check console for details.`);
        }
        return;
      }

      // Delete existing assignments for guests being reassigned
      const guestIds = newAssignments.map(a => a.guestId);
      for (const guestId of guestIds) {
        const existingAssignment = assignments.find(a => a.guestId === guestId);
        if (existingAssignment) {
          await pairingApi.deleteAssignment(existingAssignment.id);
        }
      }

      // Insert new assignments
      for (const assignment of newAssignments) {
        await pairingApi.createAssignment(assignment);
      }

      // Log to audit
      await pairingApi.createAuditLog({
        action: "import_assignments",
        entityType: "bulk_import",
        entityId: eventId,
        details: { count: newAssignments.length, errors: errors.length },
      });

      toast.success(`Imported ${newAssignments.length} assignment${newAssignments.length > 1 ? 's' : ''} successfully`);
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

      {/* Instructions banner */}
      {generatedGroups.filter((_, i) => !assignedGroupIndices.has(i)).length > 0 && (
        <div className={`p-4 rounded-lg border-2 transition-all ${selectedGroup !== null
          ? "bg-primary/10 border-primary"
          : "bg-muted border-muted-foreground/30"
          }`}>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {selectedGroup !== null ? (
              <div className="flex flex-col">
                <p className="font-medium">
                  {generatedGroups[selectedGroup].name || `Group ${selectedGroup + 1}`} selected
                  ({generatedGroups[selectedGroup].participants.length} people)
                </p>
                <p className="text-xs text-muted-foreground">Click a restaurant to assign</p>
                {generatedGroups[selectedGroup].aiAnalysis && (
                  <p className="text-xs text-blue-600 mt-1 max-w-2xl bg-blue-50 p-2 rounded">
                    💡 {generatedGroups[selectedGroup].aiAnalysis}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Click a group on the left to select it, then click a restaurant to assign
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar with Groups and Unassigned Guests */}
        <div className="col-span-3 space-y-4">
          {/* Generated Groups */}
          {generatedGroups.filter((_, i) => !assignedGroupIndices.has(i)).length > 0 && (
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-base">
                  Generated Groups ({generatedGroups.filter((_, i) => !assignedGroupIndices.has(i)).length})
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Click to select a group
                </p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {generatedGroups.map((group, index) => {
                      // Hide groups that have been assigned
                      if (assignedGroupIndices.has(index)) {
                        return null;
                      }
                      return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${selectedGroup === index
                          ? "bg-primary border-primary shadow-lg ring-2 ring-primary ring-offset-2"
                          : "hover:bg-muted hover:shadow-sm hover:border-primary/50"
                          }`}
                        onClick={() => {
                          setSelectedGroup(index);
                          toast.info(`Group ${index + 1} selected. Click a table to assign.`);
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col">
                            <p className={`font-medium text-sm ${selectedGroup === index ? "text-primary-foreground" : "text-primary"}`}>
                              {group.name || `Group ${index + 1}`}
                            </p>
                            {group.aiAnalysis && (
                              <p className={`text-[10px] line-clamp-2 mt-0.5 ${selectedGroup === index ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                                {group.aiAnalysis}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                            {group.participants.length}
                          </Badge>
                        </div>
                        <div className="flex gap-1 flex-wrap mb-1">
                          {group.genderDistribution.male > 0 && (
                            <Badge variant={selectedGroup === index ? "outline" : "outline"} className={`text-xs px-1 py-0 h-5 ${selectedGroup === index ? "border-primary-foreground/50 text-primary-foreground" : ""}`}>
                              {group.genderDistribution.male}M
                            </Badge>
                          )}
                          {group.genderDistribution.female > 0 && (
                            <Badge variant={selectedGroup === index ? "outline" : "outline"} className={`text-xs px-1 py-0 h-5 ${selectedGroup === index ? "border-primary-foreground/50 text-primary-foreground" : ""}`}>
                              {group.genderDistribution.female}F
                            </Badge>
                          )}
                        </div>
                        <p className={`text-xs ${selectedGroup === index ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          Avg: {group.averageAge?.toFixed(0)}y • {group.budget}
                        </p>
                      </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Unassigned Guests */}
          <Card className={generatedGroups.length > 0 ? "" : "sticky top-4"}>
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
              <ScrollArea className={generatedGroups.length > 0 ? "h-[250px]" : "h-[600px]"}>
                <div className="space-y-2">
                  {filteredUnassigned.map(guest => (
                    <div
                      key={guest.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedGuest === guest.id
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

        {/* Restaurant Cards */}
        <div className="col-span-9">
          <div className="grid grid-cols-3 gap-3">
            {restaurants.map(restaurant => {
              const restaurantAssignments = assignments.filter(a => a.restaurantId === restaurant.id);
              const totalSeated = restaurantAssignments.length;
              const isAtCapacity = totalSeated >= restaurant.capacity;

              // Group assignments by groupName
              const groupedAssignments: Record<string, Assignment[]> = {};
              const ungroupedAssignments: Assignment[] = [];

              restaurantAssignments.forEach(a => {
                if (a.groupName) {
                  if (!groupedAssignments[a.groupName]) groupedAssignments[a.groupName] = [];
                  groupedAssignments[a.groupName].push(a);
                } else {
                  ungroupedAssignments.push(a);
                }
              });

              return (
                <Card
                  key={restaurant.id}
                  className={`cursor-pointer transition-all duration-200 ${selectedGroup !== null
                    ? "hover:shadow-lg hover:border-primary"
                    : ""
                    }`}
                  onClick={() => {
                    if (selectedGroup !== null) {
                      handleAssignGroupToRestaurant(selectedGroup, restaurant.id);
                    } else {
                      toast.info("Select a group first, then click a restaurant to assign.");
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm">{restaurant.name}</CardTitle>
                      <Badge variant={isAtCapacity ? "secondary" : "secondary"} className={`text-xs ${isAtCapacity ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : ""}`}>
                        {totalSeated}/{restaurant.capacity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {/* Render Groups */}
                        {Object.entries(groupedAssignments).map(([groupName, groupAssigns]) => (
                          <div key={groupName} className="border rounded-md p-2 bg-muted/30">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-xs text-primary">{groupName}</span>
                              <Badge variant="outline" className="text-[10px] h-5">{groupAssigns.length}</Badge>
                            </div>
                            <div className="pl-1 space-y-1">
                              {groupAssigns.map(a => {
                                const guest = getGuestById(a.guestId);
                                if (!guest) return null;
                                return (
                                  <div key={a.guestId} className="flex justify-between items-center text-xs text-muted-foreground">
                                    <span>{guest.first_name} {guest.last_name}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-4 w-4 ml-1 hover:bg-destructive/10 hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnassignGuest(a.id);
                                      }}
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {/* Render Ungrouped Guests */}
                        {ungroupedAssignments.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Individual Guests</p>
                            {ungroupedAssignments.map(a => {
                              const guest = getGuestById(a.guestId);
                              if (!guest) return null;
                              return (
                                <div key={a.guestId} className="flex items-center justify-between p-2 bg-muted rounded text-sm" onClick={(e) => e.stopPropagation()}>
                                  <span>{guest.first_name} {guest.last_name}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnassignGuest(a.id);
                                    }}
                                  >
                                    ✕
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {restaurantAssignments.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-8">
                            No groups assigned yet
                          </p>
                        )}
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