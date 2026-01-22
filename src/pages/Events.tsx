import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, User, ArrowRight, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { eventsApi } from "@/api";

interface Event {
  id: string;
  title: string;
  eventType: string;
  type?: string;
  description: string;
  startTime: string;
  price: number;
  venue: { name: string; id: string } | null;
  capacity?: number;
  bookedCount?: number;
}

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>("All");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const data = await eventsApi.getUpcoming();
      setEvents(data || []);
    } catch (error: any) {
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to format event type for display
  const formatEventType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper to get original event type for filtering
  const getOriginalEventType = (formattedType: string) => {
    return formattedType.toLowerCase().replace(/\s+/g, '_');
  };

  // Get unique event types for filters and format them
  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach((event) => {
      const type = event.eventType || event.type;
      if (type) {
        // Format event type: replace underscores with spaces and capitalize
        const formatted = formatEventType(type);
        types.add(formatted);
      }
    });
    return ["All", ...Array.from(types).sort()];
  }, [events]);

  // Filter events by type
  const filteredEvents = useMemo(() => {
    if (selectedFilter === "All") return events;
    const filterType = getOriginalEventType(selectedFilter);
    return events.filter((event) => {
      const eventType = (event.eventType || event.type || "").toLowerCase();
      return eventType === filterType;
    });
  }, [events, selectedFilter]);

  // Get next opportunity (first event)
  const nextOpportunity = filteredEvents[0];
  const laterEvents = filteredEvents.slice(1);

  // Calculate available spots
  const getAvailableSpots = (event: Event) => {
    if (event.capacity && event.bookedCount !== undefined) {
      const available = event.capacity - event.bookedCount;
      return available > 0 ? available : 0;
    }
    // Default to showing some spots if capacity not available
    return 4;
  };

  const isSoldOut = (event: Event) => {
    if (event.capacity && event.bookedCount !== undefined) {
      return event.bookedCount >= event.capacity;
    }
    return false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
            Join the Table
          </h1>
          <p className="text-muted-foreground text-base">
            Find your next conversation
          </p>
        </div>

        {/* Event Type Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {eventTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedFilter(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedFilter === type
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {filteredEvents.length === 0 ? (
          <Card className="bg-white shadow-md rounded-2xl">
            <CardContent className="py-12 text-center">
              <p className="text-slate-600 text-lg mb-4">
                No events available at the moment. Check back soon!
              </p>
              <Button
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Next Opportunity Section */}
            {nextOpportunity && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">Next Opportunity</h2>
                <p className="text-muted-foreground mb-4">Check out what's coming up next</p>
                <Card className="bg-primary text-primary-foreground shadow-lg rounded-2xl border-0 overflow-hidden">
                  <CardContent className="p-6 md:p-8">
                    <div className="mb-4">
                      <p className="text-sm text-primary-foreground/80 uppercase tracking-wide mb-2">
                        {formatEventType(nextOpportunity.eventType || nextOpportunity.type || "Event").toUpperCase()}
                      </p>
                      <h3 className="text-2xl md:text-3xl font-bold mb-2">
                        {nextOpportunity.startTime
                          ? format(new Date(nextOpportunity.startTime), "EEEE, MMM do")
                          : "Date TBA"}
                        {nextOpportunity.startTime && (
                          <span className="text-primary-foreground/80 font-normal">
                            {" · "}
                            {format(new Date(nextOpportunity.startTime), "h:mm a")}
                          </span>
                        )}
                      </h3>
                      {nextOpportunity.venue?.name && (
                        <p className="text-primary-foreground/90 text-base">
                          {nextOpportunity.venue.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-6 text-primary-foreground/90">
                      <Zap className="h-4 w-4" />
                      {isSoldOut(nextOpportunity) ? (
                        <span>Sold Out</span>
                      ) : (
                        <span>
                          {getAvailableSpots(nextOpportunity)} spots left
                        </span>
                      )}
                      <span className="mx-1">·</span>
                      <span>{nextOpportunity.price} Birr</span>
                    </div>
                    <Button
                      onClick={() => navigate(`/events/${nextOpportunity.id}`)}
                      size="lg"
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold py-6 text-base rounded-xl"
                    >
                      Reserve Spot
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Later Events Section */}
            {laterEvents.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Later in January</h2>
                <p className="text-muted-foreground mb-4">More events coming up</p>
                <div className="space-y-4">
                  {laterEvents.map((event) => {
                    const soldOut = isSoldOut(event);
                    return (
                      <Card
                        key={event.id}
                        className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer"
                        onClick={() => navigate(`/events/${event.id}`)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <CardTitle className="text-lg">{event.title || formatEventType(event.eventType || event.type || "Event")}</CardTitle>
                                <Badge>{formatEventType(event.eventType || event.type || "Event")}</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm mb-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span>{event.startTime ? format(new Date(event.startTime), "PPP 'at' p") : 'Date TBA'}</span>
                              </div>
                              <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center gap-2 text-sm">
                                  {soldOut ? (
                                    <span className="font-medium text-muted-foreground">Sold Out</span>
                                  ) : (
                                    <>
                                      <User className="h-4 w-4 text-primary" />
                                      <span className="text-muted-foreground">
                                        {getAvailableSpots(event)} spots left
                                      </span>
                                      <span className="mx-1 text-muted-foreground">·</span>
                                    </>
                                  )}
                                  <span className="text-lg font-semibold text-primary">
                                    {event.price} Birr
                                  </span>
                                </div>
                                <Button size="sm" variant="secondary">
                                  {soldOut ? "Join Waitlist" : "View Details"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Events;
