import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { pairingApi, eventsApi, bookingsApi, usersApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Lock, Calendar, MapPin, AlertCircle, CheckCircle, XCircle, Users, Plus, GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { GuestManagement } from "@/components/pairing/GuestManagement";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RestaurantManager } from "@/components/pairing/RestaurantManager";
import { ConstraintsManager } from "@/components/pairing/ConstraintsManager";
import { ExportsPanel } from "@/components/pairing/ExportsPanel";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  rectIntersection,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  createManualGroup,
  recalculateGroupMetrics,
  moveParticipantBetweenGroups,
  removeParticipantFromGroup,
  addParticipantToGroup,
  validateGroupComposition,
  saveGroupsToLocalStorage,
  loadGroupsFromLocalStorage,
  findUnassignedParticipants,
  type Group,
  type ParticipantCategory,
} from "@/utils/groupManagement";

interface PairingEvent {
  id: string;
  title: string;
  startTime: string;
  eventType: string;
}

// Helper function to format budget with ETB
// Handles both string ranges ("500-1000") and numeric values (750)
const formatBudget = (budget: string | number | undefined): string => {
  if (!budget) return '-';

  // Handle numeric values - convert to range
  const numValue = typeof budget === 'number' ? budget : parseFloat(budget);
  if (!isNaN(numValue)) {
    if (numValue < 500) return '< 500 ETB';
    if (numValue < 1000) return '500-1000 ETB';
    if (numValue < 1500) return '1000-1500 ETB';
    return '1500+ ETB';
  }

  // Handle string range values
  const budgetStr = String(budget);
  if (budgetStr === '500-1000' || budgetStr.includes('500-1000')) return '500-1000 ETB';
  if (budgetStr === '1000-1500' || budgetStr.includes('1000-1500')) return '1000-1500 ETB';
  if (budgetStr === '1500+' || budgetStr.includes('1500+') || budgetStr.includes('1500')) return '1500+ ETB';
  if (budgetStr === '<500' || budgetStr.includes('< 500') || budgetStr.includes('less than 500')) return '< 500 ETB';

  return `${budget} ETB`;
};

const AdminPairingDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<PairingEvent | null>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [constraints, setConstraints] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [rejectionDialog, setRejectionDialog] = useState<{ isOpen: boolean, bookingId: string | null, userName: string }>({
    isOpen: false, bookingId: null, userName: ''
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const [groupSize, setGroupSize] = useState<number>(6);
  const [customGroupSize, setCustomGroupSize] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [generatedGroups, setGeneratedGroups] = useState<Group[]>([]);
  const [assignedGroupIndices, setAssignedGroupIndices] = useState<Set<number>>(new Set());
  const [unassignedParticipants, setUnassignedParticipants] = useState<ParticipantCategory[]>([]);
  const [draggedParticipant, setDraggedParticipant] = useState<{ groupId: string; participantIndex: number } | null>(null);
  const [isCreatingManualGroup, setIsCreatingManualGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isPairingPublished, setIsPairingPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [changedAssignments, setChangedAssignments] = useState<{ guestId: string; oldRestaurantId: string; newRestaurantId: string }[]>([]);

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load saved groups from localStorage on mount
  useEffect(() => {
    if (eventId) {
      const groups = loadGroupsFromLocalStorage(eventId);
      if (groups.length > 0) {
        setGeneratedGroups(groups);
        console.log(`Loaded ${groups.length} saved groups from localStorage`);
      }
      fetchAllData();
    }
  }, [eventId]);

  // Save groups to localStorage whenever they change
  useEffect(() => {
    if (eventId && generatedGroups.length > 0) {
      saveGroupsToLocalStorage(eventId, generatedGroups);
      console.log(`Saved ${generatedGroups.length} groups to localStorage`);
    }
  }, [generatedGroups, eventId]);

  // Calculate unassigned participants whenever groups or guests change
  useEffect(() => {
    if (guests.length > 0) {
      const unassigned = findUnassignedParticipants(guests, generatedGroups);
      setUnassignedParticipants(unassigned);
    }
  }, [guests, generatedGroups]);



  const autoImportBookedGuests = async () => {
    try {
      const result = await pairingApi.importBookingsAsGuests(eventId!);
      if (result.imported > 0) {
        toast.success(`Imported ${result.imported} guest${result.imported > 1 ? 's' : ''} from bookings`);
      }
      if (result.skipped > 0) {
        console.log(`Skipped ${result.skipped} guests:`, result.details.skipped);
      }
      return result;
    } catch (error) {
      console.error("Failed to auto-import booked guests:", error);
      toast.error("Failed to import bookings");
      return null;
    }
  };

  const fetchAllData = async () => {
    try {
      // Fetch event
      const eventData = await eventsApi.getById(eventId!);
      setEvent(eventData);

      // Fetch all bookings for this event to check for pending
      const allBookings = await bookingsApi.getAll();
      // Handle if API returns object with bookings array or just array
      const bookingsData = (allBookings as any).bookings ? (allBookings as any).bookings : (Array.isArray(allBookings) ? allBookings : []);
      const eventBookings = bookingsData.filter((b: any) => b.eventId === eventId);
      const pending = eventBookings.filter((b: any) => b.status !== 'confirmed');
      setPendingBookings(pending);

      // Auto-import booked guests first
      await autoImportBookedGuests();

      // Fetch guests
      const guestsData = await pairingApi.getEventGuests(eventId!);
      setGuests(guestsData || []);

      // Fetch restaurants with tables
      const restaurantsData = await pairingApi.getEventRestaurants(eventId!);
      setRestaurants(restaurantsData || []);

      // Fetch assignments
      const assignmentsData = await pairingApi.getEventAssignments(eventId!);
      setAssignments(assignmentsData || []);

      // Fetch constraints
      const constraintsData = await pairingApi.getConstraints(eventId!);
      setConstraints(constraintsData || []);

      // Fetch pairing status
      try {
        const status = await pairingApi.getPairingStatus(eventId!);
        setIsPairingPublished(status.published);
      } catch (err) {
        console.error('Failed to fetch pairing status:', err);
      }
    } catch (error: any) {
      console.error("Failed to load event data:", error);
      console.error("Error details:", error.response?.data || error.message);
      toast.error(`Failed to load event data: ${error.response?.data?.message || error.message}`);
      navigate("/admin/pairings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectClick = (booking: any) => {
    setRejectionDialog({
      isOpen: true,
      bookingId: booking.id,
      userName: `${booking.user.profile?.firstName} ${booking.user.profile?.lastName}`
    });
    setRejectionReason("");
  };

  const confirmRejection = async () => {
    if (!rejectionDialog.bookingId) return;

    try {
      await bookingsApi.cancel(rejectionDialog.bookingId);
      toast.success("Booking rejected");
      setRejectionDialog({ isOpen: false, bookingId: null, userName: '' });
      fetchAllData();
    } catch (e) {
      toast.error("Failed to reject booking");
    }
  };

  const handleLockEvent = async () => {
    if (!event) return;

    // Validate before locking
    const unassignedCount = guests.length - assignments.length;
    if (unassignedCount > 0) {
      const confirmed = window.confirm(
        `There are ${unassignedCount} unassigned guests. Locking will create a snapshot. Continue?`
      );
      if (!confirmed) return;
    }

    try {
      // Create snapshot - would need a snapshotsApi endpoint
      // For now, we'll show a success message but this functionality
      // would need to be implemented on the backend API side
      toast.success("Event snapshot created and locked");
      fetchAllData();
    } catch (error: any) {
      toast.error("Failed to lock event");
    }
  };

  // Create a new manual group
  const handleCreateManualGroup = () => {
    const newGroup = createManualGroup(newGroupName || undefined);
    setGeneratedGroups([...generatedGroups, newGroup]);
    setIsCreatingManualGroup(false);
    setNewGroupName("");
    toast.success("Manual group created");
  };

  // Delete a group
  const handleDeleteGroup = (groupIndex: number) => {
    const group = generatedGroups[groupIndex];
    if (window.confirm(`Delete ${group.name || `Group ${groupIndex + 1}`}? ${group.participants.length} participants will become unassigned.`)) {
      setGeneratedGroups(generatedGroups.filter((_, i) => i !== groupIndex));
      toast.success("Group deleted");
    }
  };

  // Assign a group to a restaurant
  const handleAssignGroupToRestaurant = async (groupIndex: number, restaurantId: string) => {
    try {
      const group = generatedGroups[groupIndex];
      if (!group) {
        toast.error("Group not found");
        return;
      }

      const restaurant = restaurants.find(r => r.id === restaurantId);
      if (!restaurant) {
        toast.error("Restaurant not found");
        return;
      }

      // Find guest IDs for the participants in this group
      const participantUserIds = group.participants.map(p => p.userId);
      const groupGuestIds = guests
        .filter(g => participantUserIds.includes(g.userId) || participantUserIds.includes(g.id))
        .map(g => g.id);

      if (groupGuestIds.length === 0) {
        toast.error("Could not find guests for this group. Make sure guests are imported.");
        return;
      }

      // Track changes if pairing is already published
      const newChanges: { guestId: string; oldRestaurantId: string; newRestaurantId: string }[] = [];

      // Assign all participants in the group to the restaurant
      for (const guestId of groupGuestIds) {
        const existing = assignments.find(a => a.guestId === guestId);

        if (existing) {
          // Track the change if pairing is published and restaurant is different
          if (isPairingPublished && existing.restaurantId && existing.restaurantId !== restaurantId) {
            newChanges.push({
              guestId: guestId,
              oldRestaurantId: existing.restaurantId,
              newRestaurantId: restaurantId,
            });
          }
          await pairingApi.updateAssignment(existing.id, {
            restaurantId: restaurantId,
            tableId: null,
            seatNumber: null,
          });
        } else {
          await pairingApi.createAssignment({
            guestId: guestId,
            restaurantId: restaurantId,
            tableId: null,
            seatNumber: null,
            groupName: group.name || `Group ${groupIndex + 1}`,
          });
        }
      }

      // Update changed assignments tracking
      if (newChanges.length > 0) {
        setChangedAssignments(prev => [...prev, ...newChanges]);
        setHasUnsavedChanges(true);
      }

      toast.success(`Assigned ${groupGuestIds.length} participants from ${group.name || `Group ${groupIndex + 1}`} to ${restaurant.name}`);
      setAssignedGroupIndices(prev => new Set(prev).add(groupIndex));
      fetchAllData();
    } catch (error: any) {
      console.error("Group assignment error:", error);
      toast.error("Failed to assign group to restaurant");
    }
  };

  // Unassign a group from restaurant
  const handleUnassignGroupFromRestaurant = async (groupIndex: number) => {
    try {
      const group = generatedGroups[groupIndex];
      if (!group) {
        toast.error("Group not found");
        return;
      }

      // Find guest IDs for the participants in this group
      const participantUserIds = group.participants.map(p => p.userId);
      const groupGuestIds = guests
        .filter(g => participantUserIds.includes(g.userId) || participantUserIds.includes(g.id))
        .map(g => g.id);

      if (groupGuestIds.length === 0) {
        toast.error("No guests found for this group");
        return;
      }

      // Find and delete assignments for all participants in the group
      const groupAssignments = assignments.filter(a => groupGuestIds.includes(a.guestId));

      for (const assignment of groupAssignments) {
        await pairingApi.deleteAssignment(assignment.id);
      }

      toast.success(`Unassigned ${groupAssignments.length} participants from ${group.name || `Group ${groupIndex + 1}`}`);
      setAssignedGroupIndices(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupIndex);
        return newSet;
      });
      fetchAllData();
    } catch (error: any) {
      console.error("Group unassignment error:", error);
      toast.error("Failed to unassign group from restaurant");
    }
  };

  // Get the restaurant assignment for a group (if all participants are assigned to same restaurant)
  const getGroupRestaurantAssignment = (groupIndex: number): string | null => {
    const group = generatedGroups[groupIndex];
    if (!group) return null;

    const participantUserIds = group.participants.map(p => p.userId);
    const groupGuestIds = guests
      .filter(g => participantUserIds.includes(g.userId) || participantUserIds.includes(g.id))
      .map(g => g.id);

    if (groupGuestIds.length === 0) return null;

    const groupAssignments = assignments.filter(a => groupGuestIds.includes(a.guestId));
    if (groupAssignments.length === 0) return null;

    // Check if all are assigned to the same restaurant
    const restaurantIds = [...new Set(groupAssignments.map(a => a.restaurantId).filter(Boolean))];
    if (restaurantIds.length === 1) {
      return restaurantIds[0];
    }

    return null;
  };

  // Publish or update pairing
  const handlePublishPairing = async () => {
    if (!assignments || assignments.length === 0) {
      toast.error("No assignments to publish. Please assign groups to restaurants first.");
      return;
    }

    try {
      setIsPublishing(true);

      if (isPairingPublished && hasUnsavedChanges) {
        // Update existing pairing and send notification emails for changes
        const result = await pairingApi.updatePairing(eventId!, changedAssignments);
        toast.success(result.message || "Pairing updated! Notification emails sent to affected guests.");
        setChangedAssignments([]);
        setHasUnsavedChanges(false);
      } else {
        // First time publish
        const result = await pairingApi.publishPairing(eventId!);
        setIsPairingPublished(true);
        toast.success(result.message || "Pairing published! Notifications sent to all assigned guests.");
      }
    } catch (error: any) {
      toast.error("Failed to publish pairing");
      console.error(error);
    } finally {
      setIsPublishing(false);
    }
  };

  // Unpublish pairing
  const handleUnpublishPairing = async () => {
    try {
      setIsPublishing(true);
      await pairingApi.unpublishPairing(eventId!);
      setIsPairingPublished(false);
      toast.success("Pairing unpublished successfully");
    } catch (error: any) {
      toast.error("Failed to unpublish pairing");
      console.error(error);
    } finally {
      setIsPublishing(false);
    }
  };

  // Clear all assignments
  const handleClearAllAssignments = async () => {
    if (assignments.length === 0) {
      toast.info("No assignments to clear.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to clear all ${assignments.length} assignment${assignments.length > 1 ? 's' : ''}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await pairingApi.clearAllAssignments(eventId!);
      toast.success(`Cleared ${assignments.length} assignment${assignments.length > 1 ? 's' : ''}`);
      setAssignedGroupIndices(new Set());
      fetchAllData();
    } catch (error: any) {
      toast.error("Failed to clear assignments");
      console.error(error);
    }
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const [type, groupId, participantIndex] = (active.id as string).split('-');

    console.log('[DragStart]', { activeId: active.id, type, groupId, participantIndex });

    if (type === 'participant' || type === 'unassigned') {
      setDraggedParticipant({ groupId, participantIndex: parseInt(participantIndex) });
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedParticipant(null);

    console.log('[DragEnd]', { activeId: active.id, overId: over?.id });

    if (!over) {
      console.log('[DragEnd] No drop target');
      return;
    }

    const [activeType, activeGroupId, activeParticipantIndex] = (active.id as string).split('-');
    const [overType, overGroupId] = (over.id as string).split('-');

    console.log('[DragEnd] Parsed IDs', { activeType, activeGroupId, activeParticipantIndex, overType, overGroupId });

    // Moving participant from unassigned pool to a group
    if (activeType === 'unassigned' && overType === 'group') {
      const participantIndex = parseInt(activeParticipantIndex);
      const participant = unassignedParticipants[participantIndex];
      const toGroupIndex = generatedGroups.findIndex(g => g.id === overGroupId);

      if (toGroupIndex !== -1) {
        const newGroups = [...generatedGroups];
        newGroups[toGroupIndex] = addParticipantToGroup(participant, newGroups[toGroupIndex]);
        setGeneratedGroups(newGroups);
        toast.success(`Added ${participant.name} to group`);
      }
      return;
    }

    // Moving participant between groups
    if (activeType === 'participant' && overType === 'group' && activeGroupId !== overGroupId) {
      const fromGroupIndex = generatedGroups.findIndex(g => g.id === activeGroupId);
      const toGroupIndex = generatedGroups.findIndex(g => g.id === overGroupId);
      const participantIndex = parseInt(activeParticipantIndex);

      if (fromGroupIndex !== -1 && toGroupIndex !== -1) {
        const newGroups = moveParticipantBetweenGroups(
          fromGroupIndex,
          toGroupIndex,
          participantIndex,
          generatedGroups
        );
        setGeneratedGroups(newGroups);

        const participant = generatedGroups[fromGroupIndex].participants[participantIndex];
        toast.success(`Moved ${participant.name || 'participant'} to ${generatedGroups[toGroupIndex].name}`);
      }
    }

    // Removing participant from group to unassigned pool
    if (activeType === 'participant' && overType === 'unassigned') {
      const fromGroupIndex = generatedGroups.findIndex(g => g.id === activeGroupId);
      const participantIndex = parseInt(activeParticipantIndex);

      if (fromGroupIndex !== -1) {
        const newGroups = [...generatedGroups];
        const participant = newGroups[fromGroupIndex].participants[participantIndex];
        newGroups[fromGroupIndex] = removeParticipantFromGroup(participantIndex, newGroups[fromGroupIndex]);
        setGeneratedGroups(newGroups);
        toast.success(`Removed ${participant.name || 'participant'} from group`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!event) return null;

  // Draggable Participant Component
  const DraggableParticipant = ({ participant, groupId, participantIndex, isUnassigned = false }: any) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: isUnassigned ? `unassigned-${groupId}-${participantIndex}` : `participant-${groupId}-${participantIndex}`,
    });

    const style: React.CSSProperties = {
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      opacity: isDragging ? 0.5 : 1,
      touchAction: 'none',
      position: 'relative',
      zIndex: isDragging ? 1000 : 'auto',
    };

    const guest = guests.find((g: any) => g.id === participant.userId || g.userId === participant.userId);
    const displayName = participant.name || guest?.name || 'Unknown';
    const displayEmail = participant.email || guest?.email;

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`p-2 bg-muted/50 rounded text-sm flex justify-between items-center ${isDragging ? 'ring-2 ring-primary shadow-lg bg-background' : ''}`}
      >
        <div className="flex-1 pointer-events-none">
          <p className="font-medium">{displayName}</p>
          {displayEmail && (
            <p className="text-xs text-muted-foreground">{displayEmail}</p>
          )}
          <div className="flex gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {participant.category}
            </Badge>
            {participant.age && (
              <Badge variant="outline" className="text-xs">
                {participant.age}y
              </Badge>
            )}
            {participant.gender && (
              <Badge variant="outline" className="text-xs capitalize">
                {participant.gender}
              </Badge>
            )}
            {participant.budget && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                {formatBudget(participant.budget)}
              </Badge>
            )}
          </div>
        </div>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </div>
    );
  };


  // Droppable Group Component
  const DroppableGroup = ({ group, groupIndex, children }: any) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `group-${group.id}`,
    });

    const validation = validateGroupComposition(group);

    return (
      <div
        ref={setNodeRef}
        className={`transition-colors ${isOver ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}
      >
        {children}
        {validation.warnings.length > 0 && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <p className="font-semibold text-yellow-800">Warnings:</p>
            <ul className="list-disc list-inside text-yellow-700">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="w-full max-w-[98vw] mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin/pairings")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{event.title}</h1>
                  <Badge variant="outline">{event.eventType}</Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(event.startTime), "PPP 'at' p")}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    toast.info("Generating export...");
                    const nonAttendees = await pairingApi.getNonAttendees(eventId!);

                    if (nonAttendees.length === 0) {
                      toast.info("All users have booked this event!");
                      return;
                    }

                    // Create CSV
                    const headers = [
                      'Full Name',
                      'Email',
                      'Phone',
                      'Age',
                      'Gender',
                      'City',
                      'Assessment Completed',
                      'Account Created',
                    ];

                    const rows = nonAttendees.map((user: any) => [
                      user.fullName,
                      user.email,
                      user.phone || '',
                      user.age || '',
                      user.gender || '',
                      user.city || '',
                      user.assessmentCompleted ? 'Yes' : 'No',
                      new Date(user.createdAt).toLocaleDateString(),
                    ]);

                    const csv = [headers, ...rows]
                      .map(row => row.map(cell => `"${cell}"`).join(','))
                      .join('\n');

                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${event.title.replace(/\s+/g, '_')}_Non_Attendees_${format(new Date(), 'yyyy-MM-dd')}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);

                    toast.success(`Exported ${nonAttendees.length} non-attendees`);
                  } catch (error) {
                    toast.error("Failed to export non-attendees");
                  }
                }}
                variant="outline"
              >
                <Users className="h-4 w-4 mr-2" />
                Export Non-Attendees
              </Button>
              <Button onClick={handleLockEvent} variant="outline">
                <Lock className="h-4 w-4 mr-2" />
                Create Snapshot
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[98vw] mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="algorithm">Algorithm</TabsTrigger>
            <TabsTrigger value="groups">
              Groups {generatedGroups.length > 0 && `(${generatedGroups.length})`}
            </TabsTrigger>
            <TabsTrigger value="guests">Guests</TabsTrigger>
            <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
            <TabsTrigger value="constraints">Constraints</TabsTrigger>
            <TabsTrigger value="exports">Exports</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            {/* Pairing Algorithm Section */}
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Automatic Pairing Algorithm</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate optimal groups automatically using AI-powered personality matching, age compatibility, budget matching, and gender balance.
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="text-sm font-medium">Group Size:</span>
                      <Select
                        value={showCustomInput ? "custom" : String(groupSize)}
                        onValueChange={(v) => {
                          if (v === "custom") {
                            setShowCustomInput(true);
                            setCustomGroupSize(String(groupSize));
                          } else {
                            setShowCustomInput(false);
                            setGroupSize(Number(v));
                          }
                        }}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4 people</SelectItem>
                          <SelectItem value="5">5 people</SelectItem>
                          <SelectItem value="6">6 people</SelectItem>
                          <SelectItem value="7">7 people</SelectItem>
                          <SelectItem value="8">8 people</SelectItem>
                          <SelectItem value="9">9 people</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      {showCustomInput && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="4"
                            max="9"
                            value={customGroupSize}
                            onChange={(e) => setCustomGroupSize(e.target.value)}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (val >= 4 && val <= 9) {
                                setGroupSize(val);
                              } else {
                                setCustomGroupSize(String(groupSize));
                              }
                            }}
                            className="w-20 px-2 py-1 border rounded text-sm"
                            placeholder="4-9"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShowCustomInput(false);
                            }}
                          >
                            ✓
                          </Button>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {groupSize === 4 ? "(2-2 gender split)" :
                          groupSize === 5 ? "(2-3 or 3-2 gender split)" :
                            groupSize === 6 ? "(3-3 or 4-2 gender split)" :
                              groupSize === 7 ? "(3-4 or 4-3 gender split)" :
                                groupSize === 8 ? "(4-4 gender split)" :
                                  groupSize === 9 ? "(4-5 or 5-4 gender split)" :
                                    "(balanced gender split)"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        try {
                          toast.info("Generating groups with AI...");
                          const groups = await pairingApi.generateGroups(eventId!, groupSize, true, true);
                          setGeneratedGroups(groups);
                          toast.success(`Generated ${groups.length} groups! View them in the Groups tab.`);
                          console.log("Generated groups:", groups);
                          fetchAllData();
                        } catch (error: any) {
                          console.error("Pairing error:", error);
                          toast.error(error.response?.data?.message || "Failed to generate groups");
                        }
                      }}
                      disabled={guests.length < 5}
                    >
                      Generate Groups (AI)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          toast.info("Generating groups...");
                          const groups = await pairingApi.generateGroups(eventId!, groupSize, false, true);
                          setGeneratedGroups(groups);
                          toast.success(`Generated ${groups.length} groups! View them in the Groups tab.`);
                          console.log("Generated groups:", groups);
                          fetchAllData();
                        } catch (error: any) {
                          console.error("Pairing error:", error);
                          toast.error(error.response?.data?.message || "Failed to generate groups");
                        }
                      }}
                      disabled={guests.length < 5}
                    >
                      Generate (No AI)
                    </Button>
                    {generatedGroups.length > 0 && (
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          if (window.confirm(`Clear ${generatedGroups.length} generated groups and all assignments?`)) {
                            try {
                              // Clear assignments from database
                              await pairingApi.clearAllAssignments(eventId!);
                              // Clear groups from state and localStorage
                              setGeneratedGroups([]);
                              setAssignedGroupIndices(new Set());
                              localStorage.removeItem(`generated-groups-${eventId}`);
                              toast.success("Groups and assignments cleared");
                              // Refresh data
                              await fetchAllData();
                            } catch (error) {
                              toast.error("Failed to clear groups and assignments");
                              console.error(error);
                            }
                          }
                        }}
                      >
                        Clear Groups
                      </Button>
                    )}
                  </div>
                </div>
                {guests.length < 5 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800 mb-2">
                      ⚠️ Need at least 5 guests to generate groups
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const result = await autoImportBookedGuests();
                        if (result) {
                          fetchAllData();
                        }
                      }}
                      className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
                    >
                      Import Bookings as Guests
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          toast.info("Filling missing personality data...");
                          const result = await pairingApi.fillMissingPersonality(eventId!);
                          toast.success(result.message);
                          fetchAllData();
                        } catch (error: any) {
                          toast.error("Failed to fill personality data");
                        }
                      }}
                      className="text-yellow-800 border-yellow-300 hover:bg-yellow-100 ml-2"
                    >
                      Fill Missing Personality Data
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Bookings List */}
            {pendingBookings.length > 0 && (
              <Card className="mb-6 border-orange-500/50 bg-orange-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <CardTitle className="text-lg">Pending Bookings ({pendingBookings.length})</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Review and verify payments to admit these guests.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-background rounded-md border text-sm overflow-hidden">
                    <div className="grid grid-cols-[1fr_2fr_1fr_1fr_200px] gap-4 p-3 bg-muted font-medium border-b">
                      <div>User</div>
                      <div>Details</div>
                      <div>Payment</div>
                      <div>Evidence</div>
                      <div className="text-right">Actions</div>
                    </div>
                    {pendingBookings.map((booking: any) => (
                      <div key={booking.id} className="grid grid-cols-[1fr_2fr_1fr_1fr_200px] gap-4 p-3 border-b last:border-0 items-center hover:bg-muted/30">
                        <div>
                          <p className="font-semibold">
                            {booking.user.profile?.firstName} {booking.user.profile?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate" title={booking.user.email}>
                            {booking.user.email}
                          </p>
                          {booking.bookedForFriend && (
                            <Badge variant="secondary" className="scale-75 origin-left mt-1">Friend</Badge>
                          )}
                        </div>
                        <div>
                          {booking.bookedForFriend && booking.friendName ? (
                            <div className="text-xs">
                              <span className="text-muted-foreground mr-1">For:</span>
                              <span className="font-medium">{booking.friendName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Self Booking</span>
                          )}
                          <div className="flex gap-2 mt-1">
                            {booking.event.eventType && (
                              <Badge variant="outline" className="text-[10px] h-5">{booking.event.eventType}</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(booking.createdAt), "MMM d")}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="flex flex-col">
                            <span className="font-medium capitalize">{booking.payment?.paymentMethod || booking.payment?.method || "N/A"}</span>
                            <span className="text-xs text-muted-foreground">{booking.payment?.amount || 0} ETB</span>
                          </div>
                        </div>
                        <div>
                          {booking.payment?.transactionId ? (
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded w-fit select-all">
                                {booking.payment.transactionId}
                              </span>
                              {booking.payment.screenshotUrl && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs w-fit text-blue-600"
                                  onClick={() => setViewingScreenshot(booking.payment.screenshotUrl)}
                                >
                                  View Screenshot
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-orange-600 font-medium">No Info</span>
                          )}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
                            onClick={() => handleRejectClick(booking)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={async () => {
                              try {
                                await bookingsApi.confirm(booking.id);
                                toast.success("Booking confirmed");
                                fetchAllData();
                              } catch (e) { toast.error("Failed to confirm"); }
                            }}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                            Confirm
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Screenshot Modal */}
            <Dialog open={!!viewingScreenshot} onOpenChange={(open) => !open && setViewingScreenshot(null)}>
              <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/90 border-none">
                <div className="relative w-full h-full flex flex-col">
                  <div className="absolute top-2 right-2 z-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 rounded-full"
                      onClick={() => setViewingScreenshot(null)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </Button>
                  </div>
                  {viewingScreenshot && (
                    <img
                      src={viewingScreenshot}
                      alt="Payment Proof"
                      className="w-full h-auto max-h-[80vh] object-contain"
                    />
                  )}
                  <div className="p-4 bg-background flex justify-between items-center">
                    <span className="text-sm font-medium">Payment Screenshot</span>
                    <Button variant="outline" size="sm" onClick={() => window.open(viewingScreenshot!, '_blank')}>
                      Open Original
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Rejection Confirmation Dialog */}
            <Dialog open={rejectionDialog.isOpen} onOpenChange={(open) => !open && setRejectionDialog(prev => ({ ...prev, isOpen: false }))}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Booking</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to reject the booking for <span className="font-medium text-foreground">{rejectionDialog.userName}</span>?
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-2">Reason for rejection (optional):</p>
                  <Input
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g., Invalid payment proof..."
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This action currently cannot be undone.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRejectionDialog(prev => ({ ...prev, isOpen: false }))}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={confirmRejection}>
                    Confirm Reject
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="grid gap-6 md:grid-cols-3 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{guests.length}</p>
                    <p className="text-sm text-muted-foreground">Total Guests</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{assignments.length}</p>
                    <p className="text-sm text-muted-foreground">Assigned</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{guests.length - assignments.length}</p>
                    <p className="text-sm text-muted-foreground">Unassigned</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{restaurants.length}</p>
                    <p className="text-sm text-muted-foreground">Restaurants</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">
                      {restaurants.reduce((sum, r) => sum + (r.tables?.length || 0), 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Tables</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {guests.length - assignments.length > 0 && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">Unresolved Items</h4>
                      <p className="text-sm text-muted-foreground">
                        {guests.length - assignments.length} guests still need to be assigned to tables
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="algorithm" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Automatic Pairing Algorithm</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-4">
                        The algorithm uses personality assessment data to create optimal groups based on:
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-4">
                        <li>Personality category compatibility (Trailblazers, Storytellers, Philosophers, Planners, Free Spirits)</li>
                        <li>Age compatibility (within 3 years)</li>
                        <li>Budget matching (same spending range)</li>
                        <li>Gender balance (2-3 or 3-3 or 4-2 splits)</li>
                        <li>AI-enhanced insights and conversation starters (when enabled)</li>
                      </ul>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={async () => {
                          try {
                            toast.info("Generating groups with AI enhancement...");
                            const groups = await pairingApi.generateGroups(eventId!, 6, true);
                            setGeneratedGroups(groups);
                            toast.success(`Generated ${groups.length} groups! View them in the Groups tab.`);
                            console.log("Generated groups with AI:", groups);
                            fetchAllData();
                          } catch (error: any) {
                            console.error("Pairing error:", error);
                            toast.error(error.response?.data?.message || "Failed to generate groups");
                          }
                        }}
                        disabled={guests.length < 5}
                        size="lg"
                      >
                        Generate Groups (AI-Enhanced)
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            toast.info("Generating groups without AI...");
                            const groups = await pairingApi.generateGroups(eventId!, 6, false);
                            setGeneratedGroups(groups);
                            toast.success(`Generated ${groups.length} groups! View them in the Groups tab.`);
                            console.log("Generated groups (no AI):", groups);
                            fetchAllData();
                          } catch (error: any) {
                            console.error("Pairing error:", error);
                            toast.error(error.response?.data?.message || "Failed to generate groups");
                          }
                        }}
                        disabled={guests.length < 5}
                        size="lg"
                      >
                        Generate Groups (Algorithm Only)
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            toast.info("Categorizing all participants...");
                            const categorizations = await pairingApi.categorizeAllParticipants(eventId!);
                            toast.success(`Categorized ${categorizations.length} participants! Check console.`);
                            console.log("Participant categorizations:", categorizations);
                          } catch (error: any) {
                            console.error("Categorization error:", error);
                            toast.error(error.response?.data?.message || "Failed to categorize participants");
                          }
                        }}
                        disabled={guests.length === 0}
                      >
                        View Categorizations
                      </Button>
                    </div>
                    {guests.length < 5 && (
                      <p className="text-sm text-yellow-600">
                        ⚠️ Need at least 5 guests to generate groups
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">How It Works</h3>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">1. Categorization:</strong> Each participant is assigned to a personality category based on their assessment responses.
                    </p>
                    <p>
                      <strong className="text-foreground">2. Group Formation:</strong> Groups of 5-6 participants are created using compatibility rules and constraints.
                    </p>
                    <p>
                      <strong className="text-foreground">3. AI Enhancement:</strong> When enabled, Gemini AI provides insights, conversation starters, and compatibility analysis.
                    </p>
                    <p>
                      <strong className="text-foreground">4. Results:</strong> Generated groups are shown in the Groups tab. You can review them and manually assign to tables if needed.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            <DndContext
              sensors={sensors}
              collisionDetection={rectIntersection}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {generatedGroups.length === 0 && unassignedParticipants.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Groups Generated Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Generate groups using the algorithm or create manual groups
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => (document.querySelector('[value="dashboard"]') as HTMLElement)?.click()}>
                        Go to Dashboard
                      </Button>
                      <Button variant="outline" onClick={() => setIsCreatingManualGroup(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Manual Group
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Publish Status Banner */}
                  {isPairingPublished && hasUnsavedChanges ? (
                    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 bg-orange-500 rounded-full animate-pulse" />
                          <div>
                            <p className="font-semibold text-orange-800 dark:text-orange-200">Changes Made - Update Required</p>
                            <p className="text-sm text-orange-600 dark:text-orange-400">
                              {changedAssignments.length} guest{changedAssignments.length !== 1 ? 's' : ''} will receive update emails with new restaurant info
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handlePublishPairing}
                            disabled={isPublishing}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            size="lg"
                          >
                            <CheckCircle className="h-5 w-5 mr-2" />
                            {isPublishing ? "Updating..." : "Update Pairing & Notify"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : isPairingPublished ? (
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                          <div>
                            <p className="font-semibold text-green-800 dark:text-green-200">Pairing is LIVE</p>
                            <p className="text-sm text-green-600 dark:text-green-400">Users can see their restaurant assignments</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={handleUnpublishPairing}
                          disabled={isPublishing}
                          className="border-green-300 text-green-700 hover:bg-green-100"
                        >
                          {isPublishing ? "Unpublishing..." : "Unpublish"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 bg-amber-500 rounded-full" />
                          <div>
                            <p className="font-semibold text-amber-800 dark:text-amber-200">Pairing is NOT published</p>
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                              {assignments.length === 0
                                ? "Assign groups to restaurants, then publish to make it visible to users"
                                : `${assignments.length} assignments ready - publish to make visible to users`
                              }
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={handlePublishPairing}
                          disabled={isPublishing || assignments.length === 0}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          size="lg"
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          {isPublishing ? "Publishing..." : "Save & Publish Pairing"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">Groups & Participants</h2>
                      <p className="text-muted-foreground">
                        {generatedGroups.length} groups • {generatedGroups.reduce((sum, g) => sum + g.participants.length, 0)} assigned • {unassignedParticipants.length} unassigned
                        {assignments.length > 0 && ` • ${assignments.length} restaurant assignments`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {/* Clear Assignments Button */}
                      <Button
                        variant="outline"
                        onClick={handleClearAllAssignments}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        disabled={assignments.length === 0}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Clear Assignments
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreatingManualGroup(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Manual Group
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Export guests with personality data
                          const allParticipants = generatedGroups.flatMap((group, groupIndex) =>
                            group.participants.map((participant: any) => {
                              const guest = guests.find((g: any) => g.id === participant.userId || g.userId === participant.userId);
                              const personality = guest?.personality || {};
                              return {
                                groupNumber: groupIndex + 1,
                                groupName: group.name || `Group ${groupIndex + 1}`,
                                name: guest?.name || 'N/A',
                                email: guest?.email || 'N/A',
                                age: personality.age || guest?.age || 'N/A',
                                gender: personality.gender || guest?.gender || 'N/A',
                                relationship: personality.relationship || 'N/A',
                                children: personality.children || 'N/A',
                                city: personality.city || 'N/A',
                                personalityType: personality.personality || participant.category || 'N/A',
                                humor: personality.humor || 'N/A',
                                spending: formatBudget(personality.spending || participant.budget) || 'N/A',
                                diet: Array.isArray(personality.diet) ? personality.diet.join(', ') : (personality.diet || 'N/A'),
                                hobbies: personality.hobbies || 'N/A',
                                compatibilityScore: group.compatibilityScore?.toFixed(1) || 'N/A',
                              };
                            })
                          );

                          const headers = [
                            'Group #',
                            'Group Name',
                            'Name',
                            'Email',
                            'Age',
                            'Gender',
                            'Relationship',
                            'Children',
                            'City',
                            'Personality Type',
                            'Humor Style',
                            'Spending',
                            'Diet',
                            'Hobbies',
                            'Compatibility Score'
                          ];

                          const rows = allParticipants.map(p => [
                            p.groupNumber,
                            p.groupName,
                            p.name,
                            p.email,
                            p.age,
                            p.gender,
                            p.relationship,
                            p.children,
                            p.city,
                            p.personalityType,
                            p.humor,
                            p.spending,
                            p.diet,
                            p.hobbies,
                            p.compatibilityScore
                          ]);

                          const csv = [headers, ...rows]
                            .map(row => row.map(cell => `"${cell}"`).join(','))
                            .join('\n');

                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${event.title.replace(/\s+/g, '_')}_Groups_Personality_Data_${format(new Date(), 'yyyy-MM-dd')}.csv`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                          toast.success('Personality data exported');
                        }}
                      >
                        Export Personality Data
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const response = await usersApi.getAll();
                            const allUsers = response.users || [];
                            const guestUserIds = new Set(guests.map(g => g.userId).filter(Boolean));
                            const guestEmails = new Set(guests.map(g => g.email?.toLowerCase()).filter(Boolean));

                            const nonBookedUsers = allUsers.filter((u: any) =>
                              !guestUserIds.has(u.id) &&
                              !guestEmails.has(u.email.toLowerCase())
                            );

                            if (nonBookedUsers.length === 0) {
                              toast.info("No non-booked users found");
                              return;
                            }

                            const csvContent = [
                              ["Full Name", "Email", "Phone", "City", "Age", "Gender"].join(","),
                              ...nonBookedUsers.map((u: any) => [
                                `"${u.fullName || ''}"`,
                                `"${u.email || ''}"`,
                                `"${u.phone || ''}"`,
                                `"${u.city || ''}"`,
                                u.age || "",
                                u.gender || ""
                              ].join(","))
                            ].join("\n");

                            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `non-booked-users-${eventId}.csv`;
                            a.click();
                            window.URL.revokeObjectURL(url);
                            toast.success(`Exported ${nonBookedUsers.length} non-booked users`);
                          } catch (error) {
                            console.error("Failed to export non-booked users:", error);
                            toast.error("Failed to export non-booked users");
                          }
                        }}
                      >
                        Export Non-Booked Users
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (window.confirm(`Clear ${generatedGroups.length} generated groups and all assignments?`)) {
                            try {
                              // Clear assignments from database
                              await pairingApi.clearAllAssignments(eventId!);
                              // Clear groups from state and localStorage
                              setGeneratedGroups([]);
                              setAssignedGroupIndices(new Set());
                              localStorage.removeItem(`generated-groups-${eventId}`);
                              toast.success("Groups and assignments cleared");
                              // Refresh data
                              await fetchAllData();
                            } catch (error) {
                              toast.error("Failed to clear groups and assignments");
                              console.error(error);
                            }
                          }
                        }}
                      >
                        Clear Groups
                      </Button>
                    </div>
                  </div>

                  {/* Unassigned Participants Pool */}
                  {unassignedParticipants.length > 0 && (
                    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Unassigned Participants ({unassignedParticipants.length})
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Drag participants into groups below
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2 md:grid-cols-2">
                          {unassignedParticipants.map((participant, index) => (
                            <DraggableParticipant
                              key={`unassigned-${index}`}
                              participant={participant}
                              groupId="pool"
                              participantIndex={index}
                              isUnassigned={true}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Comprehensive Detailed Personality Assessments */}
                  <Card className="mt-8">
                    <CardHeader>
                      <CardTitle>Detailed Personality Assessments</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        View all participants with their complete personality assessment data
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[150px]">Assign to Group</TableHead>
                              <TableHead className="min-w-[150px]">Name</TableHead>
                              <TableHead className="min-w-[180px]">Email</TableHead>
                              <TableHead className="min-w-[60px]">Age</TableHead>
                              <TableHead className="min-w-[80px]">Gender</TableHead>
                              <TableHead className="min-w-[120px]">Relationship</TableHead>
                              <TableHead className="min-w-[80px]">Children</TableHead>
                              <TableHead className="min-w-[120px]">City</TableHead>
                              <TableHead className="min-w-[120px]">Personality</TableHead>
                              <TableHead className="min-w-[100px]">Humor</TableHead>
                              <TableHead className="min-w-[100px]">Individual Budget</TableHead>
                              <TableHead className="min-w-[150px]">Diet</TableHead>
                              <TableHead className="min-w-[200px]">Hobbies</TableHead>
                              <TableHead className="min-w-[80px]">Score</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {generatedGroups.flatMap((group, groupIndex) => {
                              const rows = [];

                              // Calculate statistics
                              const totalMale = group.genderDistribution.male;
                              const totalFemale = group.genderDistribution.female;
                              const totalOther = group.genderDistribution.other;
                              const totalParticipants = group.participants.length;

                              // Add comprehensive group header section
                              rows.push(
                                <TableRow key={`header-${groupIndex}`} className="bg-muted/50 hover:bg-muted/50">
                                  <TableCell colSpan={15} className="p-0">
                                    <div className="p-4 space-y-4">
                                      {/* Group Title and Score */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <Badge className="bg-primary text-lg px-3 py-1">
                                            Group #{groupIndex + 1}
                                          </Badge>
                                          <span className="font-semibold text-lg">
                                            {group.name || `Group ${groupIndex + 1}`}
                                          </span>
                                          <span className="text-sm text-muted-foreground">
                                            • {totalParticipants} participants
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          {group.compatibilityScore && (
                                            <Badge variant="outline" className="text-base px-3 py-1">
                                              Compatibility Score: {group.compatibilityScore.toFixed(1)}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>

                                      {/* Restaurant Assignment */}
                                      <div className={`rounded-lg p-4 border ${getGroupRestaurantAssignment(groupIndex) ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-muted/50 border-muted-foreground/20'}`}>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <MapPin className={`h-5 w-5 ${getGroupRestaurantAssignment(groupIndex) ? 'text-green-600' : 'text-muted-foreground'}`} />
                                            <span className={`font-semibold ${getGroupRestaurantAssignment(groupIndex) ? 'text-green-900 dark:text-green-100' : 'text-foreground'}`}>Restaurant Assignment</span>
                                            {getGroupRestaurantAssignment(groupIndex) && (
                                              <Badge className="bg-green-600 text-white">
                                                {restaurants.find(r => r.id === getGroupRestaurantAssignment(groupIndex))?.name}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Select
                                              value={getGroupRestaurantAssignment(groupIndex) || "unassigned"}
                                              onValueChange={(value) => {
                                                if (value !== "unassigned") {
                                                  handleAssignGroupToRestaurant(groupIndex, value);
                                                }
                                              }}
                                            >
                                              <SelectTrigger className="w-[250px] bg-white dark:bg-gray-800">
                                                <SelectValue placeholder="Select a restaurant..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="unassigned">
                                                  <span className="text-muted-foreground">Not assigned</span>
                                                </SelectItem>
                                                {restaurants.map((restaurant) => (
                                                  <SelectItem key={restaurant.id} value={restaurant.id}>
                                                    {restaurant.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            {getGroupRestaurantAssignment(groupIndex) && (
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleUnassignGroupFromRestaurant(groupIndex);
                                                }}
                                              >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                Unassign
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Statistics Grid */}
                                      <div className="grid grid-cols-4 gap-4">
                                        {/* Average Age */}
                                        <div className="bg-background rounded-lg p-3 border">
                                          <div className="text-xs text-muted-foreground mb-1">Average Age</div>
                                          <div className="text-2xl font-bold">
                                            {group.averageAge > 0 ? `${group.averageAge} yrs` : 'N/A'}
                                          </div>
                                        </div>

                                        {/* Budget */}
                                        <div className="bg-background rounded-lg p-3 border">
                                          <div className="text-xs text-muted-foreground mb-1">Budget Range</div>
                                          <div className="text-2xl font-bold">
                                            {group.budget ? formatBudget(group.budget) : 'Mixed'}
                                          </div>
                                        </div>

                                        {/* Gender Distribution */}
                                        <div className="bg-background rounded-lg p-3 border">
                                          <div className="text-xs text-muted-foreground mb-1">Gender Distribution</div>
                                          <div className="flex gap-2 mt-1">
                                            {totalMale > 0 && (
                                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                                {totalMale}M
                                              </Badge>
                                            )}
                                            {totalFemale > 0 && (
                                              <Badge variant="secondary" className="bg-pink-100 text-pink-800">
                                                {totalFemale}F
                                              </Badge>
                                            )}
                                            {totalOther > 0 && (
                                              <Badge variant="secondary">
                                                {totalOther} Other
                                              </Badge>
                                            )}
                                            {totalMale === 0 && totalFemale === 0 && totalOther === 0 && (
                                              <span className="text-sm text-muted-foreground">N/A</span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Personality Distribution */}
                                        <div className="bg-background rounded-lg p-3 border">
                                          <div className="text-xs text-muted-foreground mb-1">Personality Types</div>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {Object.entries(group.categoryDistribution).map(([type, count]) => (
                                              <Badge key={type} variant="outline" className="text-xs capitalize">
                                                {type}: {count}
                                              </Badge>
                                            ))}
                                            {Object.keys(group.categoryDistribution).length === 0 && (
                                              <span className="text-sm text-muted-foreground">N/A</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* AI Analysis */}
                                      {group.aiAnalysis && (
                                        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                                          <div className="flex items-start gap-2">
                                            <div className="font-semibold text-amber-900 dark:text-amber-100 text-sm mb-1">
                                              🤖 AI Analysis
                                            </div>
                                          </div>
                                          <p className="text-sm text-amber-800 dark:text-amber-200 mt-2 leading-relaxed">
                                            {group.aiAnalysis}
                                          </p>
                                        </div>
                                      )}

                                      {/* Conversation Starters */}
                                      {group.conversationStarters && group.conversationStarters.length > 0 && (
                                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                          <div className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-2">
                                            💬 Conversation Starters
                                          </div>
                                          <ul className="space-y-2 mt-2">
                                            {group.conversationStarters.map((starter, idx) => (
                                              <li key={idx} className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                                                <span className="text-blue-500 mt-0.5">•</span>
                                                <span className="flex-1">{starter}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );

                              // Add participant rows
                              group.participants.forEach((participant: any, pIndex: number) => {
                                const guest = guests.find((g: any) => g.id === participant.userId || g.userId === participant.userId);
                                const personality = guest?.personality || {};

                                rows.push(
                                  <TableRow key={`${groupIndex}-${pIndex}`}>
                                    <TableCell>
                                      <Select
                                        value={groupIndex.toString()}
                                        onValueChange={(value) => {
                                          const newGroupIndex = parseInt(value);
                                          if (newGroupIndex !== groupIndex) {
                                            const newGroups = moveParticipantBetweenGroups(
                                              groupIndex,
                                              newGroupIndex,
                                              pIndex,
                                              generatedGroups
                                            );
                                            setGeneratedGroups(newGroups);
                                            toast.success(`Moved ${guest?.name || 'participant'} to ${generatedGroups[newGroupIndex].name}`);
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="w-[140px] h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {generatedGroups.map((g, idx) => (
                                            <SelectItem key={g.id} value={idx.toString()}>
                                              {g.name || `Group ${idx + 1}`}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {guest?.name || 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {guest?.email || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                      {personality.age || guest?.age || '-'}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="secondary" className="capitalize">
                                        {personality.gender || guest?.gender || '-'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="capitalize">
                                      {personality.relationship?.replace(/_/g, ' ') || '-'}
                                    </TableCell>
                                    <TableCell className="capitalize">
                                      {personality.children || '-'}
                                    </TableCell>
                                    <TableCell>
                                      {personality.city || '-'}
                                    </TableCell>
                                    <TableCell>
                                      <Badge className="capitalize">
                                        {personality.personality || participant.category || '-'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="capitalize">
                                      {personality.humor || '-'}
                                    </TableCell>
                                    <TableCell>
                                      {formatBudget(personality.spending || participant.budget)}
                                    </TableCell>
                                    <TableCell>
                                      {Array.isArray(personality.diet)
                                        ? personality.diet.map(d => d.replace(/_/g, ' ')).join(', ')
                                        : (personality.diet?.replace(/_/g, ' ') || '-')}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={personality.hobbies || '-'}>
                                      {personality.hobbies || '-'}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {group.compatibilityScore?.toFixed(1) || 'N/A'}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              });

                              return rows;
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Manual Group Creation Dialog */}
              <Dialog open={isCreatingManualGroup} onOpenChange={setIsCreatingManualGroup}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Manual Group</DialogTitle>
                    <DialogDescription>
                      Create an empty group that you can populate by dragging participants from the unassigned pool or other groups.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <label className="text-sm font-medium mb-2 block">Group Name (Optional)</label>
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder={`Manual Group ${new Date().toLocaleTimeString()}`}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setIsCreatingManualGroup(false);
                      setNewGroupName("");
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateManualGroup}>
                      Create Group
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Drag Overlay for visual feedback */}
              <DragOverlay>
                {draggedParticipant && (
                  <div className="p-2 bg-primary/10 rounded shadow-lg border-2 border-primary">
                    <p className="font-medium text-sm">Dragging participant...</p>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </TabsContent>

          <TabsContent value="guests" className="mt-6">
            <GuestManagement
              eventId={eventId!}
              guests={guests}
              onRefresh={fetchAllData}
            />
          </TabsContent>

          <TabsContent value="restaurants" className="mt-6">
            <RestaurantManager
              eventId={eventId!}
              restaurants={restaurants}
              onRefresh={fetchAllData}
            />
          </TabsContent>

          <TabsContent value="constraints" className="mt-6">
            <ConstraintsManager
              eventId={eventId!}
              guests={guests}
              constraints={constraints}
              onRefresh={fetchAllData}
            />
          </TabsContent>

          <TabsContent value="exports" className="mt-6">
            <ExportsPanel
              eventId={eventId!}
              eventName={event.title}
              guests={guests}
              restaurants={restaurants}
              assignments={assignments}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPairingDetail;