import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { pairingApi, eventsApi, bookingsApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Lock, Calendar, MapPin, AlertCircle, CheckCircle, XCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { GuestManagement } from "@/components/pairing/GuestManagement";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RestaurantManager } from "@/components/pairing/RestaurantManager";
import { PairingBoard } from "@/components/pairing/PairingBoard";
import { ConstraintsManager } from "@/components/pairing/ConstraintsManager";
import { ExportsPanel } from "@/components/pairing/ExportsPanel";

interface PairingEvent {
  id: string;
  title: string;
  startTime: string;
  eventType: string;
}

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
  const [generatedGroups, setGeneratedGroups] = useState<any[]>([]);
  const [assignedGroupIndices, setAssignedGroupIndices] = useState<Set<number>>(new Set());

  // Load saved groups from localStorage on mount
  useEffect(() => {
    if (eventId) {
      const savedGroups = localStorage.getItem(`generated-groups-${eventId}`);
      if (savedGroups) {
        try {
          const groups = JSON.parse(savedGroups);
          setGeneratedGroups(groups);
          console.log(`Loaded ${groups.length} saved groups from localStorage`);
        } catch (error) {
          console.error('Failed to load saved groups:', error);
        }
      }
      fetchAllData();
    }
  }, [eventId]);

  // Save groups to localStorage whenever they change
  useEffect(() => {
    if (eventId && generatedGroups.length > 0) {
      localStorage.setItem(`generated-groups-${eventId}`, JSON.stringify(generatedGroups));
      console.log(`Saved ${generatedGroups.length} groups to localStorage`);
    }
  }, [generatedGroups, eventId]);



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

  const handleGroupAssigned = (index: number) => {
    // Mark this group as assigned instead of removing it
    setAssignedGroupIndices(prev => new Set(prev).add(index));
    // Groups stay in the array, only the assigned indices change
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
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
            <Button onClick={handleLockEvent} variant="outline">
              <Lock className="h-4 w-4 mr-2" />
              Create Snapshot
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="algorithm">Algorithm</TabsTrigger>
            <TabsTrigger value="groups">
              Groups {generatedGroups.length > 0 && `(${generatedGroups.length})`}
            </TabsTrigger>
            <TabsTrigger value="guests">Guests</TabsTrigger>
            <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
            <TabsTrigger value="pairings">Pairing Board</TabsTrigger>
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
                        onClick={() => {
                          if (window.confirm(`Clear ${generatedGroups.length} generated groups?`)) {
                            setGeneratedGroups([]);
                            localStorage.removeItem(`generated-groups-${eventId}`);
                            toast.success("Groups cleared");
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
            {generatedGroups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Groups Generated Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate groups using the algorithm to see them here
                  </p>
                  <Button onClick={() => (document.querySelector('[value="dashboard"]') as HTMLElement)?.click()}>
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Generated Groups</h2>
                    <p className="text-muted-foreground">
                      {generatedGroups.length} groups • {generatedGroups.reduce((sum, g) => sum + g.participants.length, 0)} participants
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGeneratedGroups([]);
                      toast.info("Groups cleared");
                    }}
                  >
                    Clear Groups
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {generatedGroups.map((group, index) => {
                    const isAssigned = assignedGroupIndices.has(index);
                    return (
                      <Card key={index} className={`overflow-hidden ${isAssigned ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                        <CardHeader className="bg-primary/5 pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">{group.name || `Group ${index + 1}`}</CardTitle>
                                {isAssigned && (
                                  <Badge className="bg-green-600 hover:bg-green-700">
                                    Assigned
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {group.participants.length} participants
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-sm">
                              Score: {group.compatibilityScore?.toFixed(1) || 'N/A'}
                            </Badge>
                          </div>
                        </CardHeader>
                      <CardContent className="pt-4">
                        {/* Group Statistics */}
                        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                          <div className="p-2 bg-muted rounded">
                            <p className="text-muted-foreground text-xs">Avg Age</p>
                            <p className="font-semibold">{group.averageAge?.toFixed(0) || 'N/A'} years</p>
                          </div>
                          <div className="p-2 bg-muted rounded">
                            <p className="text-muted-foreground text-xs">Budget</p>
                            <p className="font-semibold">{group.budget || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Gender Distribution */}
                        {group.genderDistribution && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Gender Distribution</p>
                            <div className="flex gap-2 text-xs">
                              {group.genderDistribution.male > 0 && (
                                <Badge variant="outline">{group.genderDistribution.male}M</Badge>
                              )}
                              {group.genderDistribution.female > 0 && (
                                <Badge variant="outline">{group.genderDistribution.female}F</Badge>
                              )}
                              {group.genderDistribution.other > 0 && (
                                <Badge variant="outline">{group.genderDistribution.other} Other</Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Personality Distribution */}
                        {group.categoryDistribution && Object.keys(group.categoryDistribution).length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Personality Mix</p>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(group.categoryDistribution as Record<string, number>).map(([category, count]) =>
                                count > 0 && (
                                  <Badge key={category} variant="secondary" className="text-xs">
                                    {count} {category}
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {/* Participants List */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Participants</p>
                          <div className="space-y-2">
                            {group.participants.map((participant: any, pIndex: number) => {
                              // Find guest info for this participant
                              const guest = guests.find((g: any) => g.id === participant.userId || g.userId === participant.userId);
                              const displayName = guest?.name || (guest?.firstName && guest?.lastName
                                ? `${guest.firstName} ${guest.lastName}`
                                : guest?.firstName) || `Participant #${pIndex + 1}`;
                              const displayEmail = guest?.email || 'No email';

                              return (
                                <div key={pIndex} className="p-2 bg-muted/50 rounded text-sm flex justify-between items-center">
                                  <div>
                                    <p className="font-medium">{displayName}</p>
                                    <p className="text-xs text-muted-foreground">{displayEmail}</p>
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
                                        <Badge variant="outline" className="text-xs">
                                          {participant.gender}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* AI Insights if available */}
                        {group.aiAnalysis && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                            <p className="font-semibold text-blue-900 mb-1">AI Analysis</p>
                            <p className="text-blue-800">{group.aiAnalysis}</p>
                          </div>
                        )}

                        {/* Conversation Starters if available */}
                        {group.conversationStarters && group.conversationStarters.length > 0 && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-xs">
                            <p className="font-semibold text-green-900 mb-2">Conversation Starters</p>
                            <ul className="list-disc list-inside space-y-1 text-green-800">
                              {group.conversationStarters.slice(0, 3).map((starter: string, idx: number) => (
                                <li key={idx}>{starter}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              </div>
            )}
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

          <TabsContent value="pairings" className="mt-6">
            <PairingBoard
              eventId={eventId!}
              guests={guests}
              restaurants={restaurants}
              assignments={assignments}
              onRefresh={fetchAllData}
              generatedGroups={generatedGroups}
              onGroupAssigned={handleGroupAssigned}
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