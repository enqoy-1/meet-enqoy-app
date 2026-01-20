import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { eventsApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, ArrowLeft, Users, MapPin, Search, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface Event {
  id: string;
  title: string;
  startTime: string;
  eventType: string;
  venue?: {
    name: string;
  } | null;
  bookings?: {
    id: string;
    status: string;
  }[];
}

const AdminPairings = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const data = await eventsApi.getAll();
      setEvents(data || []);
    } catch (error: any) {
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.venue?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || event.eventType === typeFilter;

      let matchesDate = true;
      if (startDate || endDate) {
        const eventDate = new Date(event.startTime);
        if (startDate && endDate) {
          matchesDate = isWithinInterval(eventDate, {
            start: startOfDay(startDate),
            end: endOfDay(endDate),
          });
        } else if (startDate) {
          matchesDate = eventDate >= startOfDay(startDate);
        } else if (endDate) {
          matchesDate = eventDate <= endOfDay(endDate);
        }
      }

      return matchesSearch && matchesType && matchesDate;
    });
  }, [events, searchQuery, typeFilter, startDate, endDate]);

  // Separate upcoming and past events
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = new Date();
    const upcoming = filteredEvents
      .filter(event => new Date(event.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const past = filteredEvents
      .filter(event => new Date(event.startTime) < now)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [filteredEvents]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold">Events</h1>
                <p className="text-sm text-muted-foreground">
                  Select an event to manage guest pairings
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/admin/events")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Events
            </Button>
          </div>
        </header>

      <main className="container mx-auto px-4 py-8">
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create events in the Events section first, then manage pairings here.
              </p>
              <Button onClick={() => navigate("/admin/events")}>
                Go to Events
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events or venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="scavenger_hunt">Scavenger Hunt</SelectItem>
                  <SelectItem value="mixer">Mixer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setStartDate(undefined);
                    setEndDate(undefined);
                  }}
                  title="Clear date filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Upcoming Events */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  Upcoming Events
                  <Badge variant="secondary">{upcomingEvents.length}</Badge>
                </h2>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="text-center">Bookings</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No upcoming events found
                        </TableCell>
                      </TableRow>
                    ) : (
                      upcomingEvents.map((event) => (
                        <TableRow
                          key={event.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/admin/pairings/${event.id}`)}
                        >
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{event.eventType}</Badge>
                          </TableCell>
                          <TableCell>
                            {event.venue ? (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{event.venue.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No venue</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{format(new Date(event.startTime), "PPP 'at' p")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-semibold">
                              <Users className="h-3 w-3 mr-1" />
                              {event.bookings?.length || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/pairings/${event.id}`);
                              }}
                            >
                              Manage Pairings
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Past Events */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  Past Events
                  <Badge variant="secondary">{pastEvents.length}</Badge>
                </h2>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="text-center">Bookings</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No past events found
                        </TableCell>
                      </TableRow>
                    ) : (
                      pastEvents.map((event) => (
                        <TableRow
                          key={event.id}
                          className="cursor-pointer hover:bg-muted/50 opacity-75"
                          onClick={() => navigate(`/admin/pairings/${event.id}`)}
                        >
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{event.eventType}</Badge>
                          </TableCell>
                          <TableCell>
                            {event.venue ? (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{event.venue.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No venue</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{format(new Date(event.startTime), "PPP 'at' p")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-semibold">
                              <Users className="h-3 w-3 mr-1" />
                              {event.bookings?.length || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/pairings/${event.id}`);
                              }}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
    </AdminLayout>
  );
};

export default AdminPairings;