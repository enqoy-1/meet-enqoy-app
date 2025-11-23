import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Lock, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PairingEvent {
  id: string;
  name: string;
  date: string;
  city: string | null;
  status: "draft" | "locked";
}

const AdminPairingDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<PairingEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from("pairing_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error: any) {
      toast.error("Failed to load event");
      navigate("/admin/pairings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockEvent = async () => {
    if (!event) return;

    try {
      const { error } = await supabase
        .from("pairing_events")
        .update({ status: "locked" })
        .eq("id", event.id);

      if (error) throw error;

      // Log to audit
      await supabase.from("pairing_audit_log").insert({
        event_id: event.id,
        action: "lock_event",
        details: { locked_at: new Date().toISOString() },
      });

      toast.success("Event locked successfully");
      fetchEvent();
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
                  <h1 className="text-2xl font-bold">{event.name}</h1>
                  <Badge variant={event.status === "locked" ? "default" : "secondary"}>
                    {event.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(event.date), "PPP 'at' p")}
                  </div>
                  {event.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.city}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {event.status === "draft" && (
              <Button onClick={handleLockEvent} variant="outline">
                <Lock className="h-4 w-4 mr-2" />
                Lock Event
              </Button>
            )}
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
            <Card>
              <CardContent className="py-12 text-center">
                <h3 className="text-lg font-semibold mb-2">Event Dashboard</h3>
                <p className="text-muted-foreground">
                  Dashboard with progress bars and statistics coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guests" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center">
                <h3 className="text-lg font-semibold mb-2">Guest Management</h3>
                <p className="text-muted-foreground">
                  Guest directory with CSV import and batch editing coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restaurants" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center">
                <h3 className="text-lg font-semibold mb-2">Restaurants & Tables</h3>
                <p className="text-muted-foreground">
                  Restaurant and table management coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pairings" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center">
                <h3 className="text-lg font-semibold mb-2">Pairing Board</h3>
                <p className="text-muted-foreground">
                  Drag-and-drop pairing board coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="constraints" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center">
                <h3 className="text-lg font-semibold mb-2">Pairing Constraints</h3>
                <p className="text-muted-foreground">
                  Constraint management coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exports" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center">
                <h3 className="text-lg font-semibold mb-2">Exports</h3>
                <p className="text-muted-foreground">
                  Export seating lists and guest cards coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPairingDetail;