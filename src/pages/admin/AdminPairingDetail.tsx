import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Lock, Calendar, MapPin, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { GuestManagement } from "@/components/pairing/GuestManagement";
import { RestaurantManager } from "@/components/pairing/RestaurantManager";
import { PairingBoard } from "@/components/pairing/PairingBoard";
import { ConstraintsManager } from "@/components/pairing/ConstraintsManager";
import { ExportsPanel } from "@/components/pairing/ExportsPanel";

interface PairingEvent {
  id: string;
  title: string;
  date_time: string;
  type: string;
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

  useEffect(() => {
    if (eventId) {
      fetchAllData();
    }
  }, [eventId]);

  const fetchAllData = async () => {
    try {
      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch guests
      const { data: guestsData } = await supabase
        .from("pairing_guests")
        .select("*")
        .eq("event_id", eventId)
        .order("last_name", { ascending: true });

      setGuests(guestsData || []);

      // Fetch restaurants with tables
      const { data: restaurantsData } = await supabase
        .from("pairing_restaurants")
        .select(`
          *,
          tables:pairing_tables(*)
        `)
        .eq("event_id", eventId)
        .order("name", { ascending: true });

      setRestaurants(restaurantsData || []);

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from("pairing_assignments")
        .select("*")
        .eq("event_id", eventId);

      setAssignments(assignmentsData || []);

      // Fetch constraints
      const { data: constraintsData } = await supabase
        .from("pairing_constraints")
        .select("*")
        .eq("event_id", eventId);

      setConstraints(constraintsData || []);
    } catch (error: any) {
      toast.error("Failed to load event data");
      navigate("/admin/pairings");
    } finally {
      setIsLoading(false);
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
      // Create snapshot in audit log
      await supabase.from("pairing_audit_log").insert({
        event_id: event.id,
        action: "lock_event",
        details: { 
          locked_at: new Date().toISOString(),
          total_guests: guests.length,
          assigned_guests: assignments.length,
          snapshot: {
            guests,
            restaurants,
            assignments,
            constraints,
          },
        },
      });

      toast.success("Event snapshot created and locked");
      fetchAllData();
    } catch (error: any) {
      toast.error("Failed to lock event");
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
                  <Badge variant="outline">{event.type}</Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(event.date_time), "PPP 'at' p")}
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="guests">Guests</TabsTrigger>
            <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
            <TabsTrigger value="pairings">Pairing Board</TabsTrigger>
            <TabsTrigger value="constraints">Constraints</TabsTrigger>
            <TabsTrigger value="exports">Exports</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
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