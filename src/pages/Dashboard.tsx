import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, LogOut, Settings } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import heroDining from "@/assets/hero-dining.jpg";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";

interface Event {
  id: string;
  title: string;
  type: string;
  date_time: string;
  price: number;
  venues: { name: string } | null;
}

interface Booking {
  id: string;
  status: string;
  events: Event;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  type: string;
  date_time: string;
  price: number;
  venues: { name: string } | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<any>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Fetch bookings with events
      const { data: bookings } = await supabase
        .from("bookings")
        .select(`
          *,
          events (
            *,
            venues (name)
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false });

      if (bookings) {
        const now = new Date();
        const upcoming = bookings.filter(b => new Date(b.events.date_time) > now);
        const past = bookings.filter(b => new Date(b.events.date_time) <= now);
        setUpcomingBookings(upcoming);
        setPastBookings(past);
      }

      // Fetch announcements
      const { data: announcementsData } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      setAnnouncements(announcementsData || []);

      // Fetch upcoming events (next 2)
      const now = new Date().toISOString();
      const { data: eventsData } = await supabase
        .from("events")
        .select(`
          *,
          venues (name)
        `)
        .eq("is_visible", true)
        .gte("date_time", now)
        .order("date_time", { ascending: true })
        .limit(2);

      setUpcomingEvents(eventsData || []);
    } catch (error: any) {
      toast.error("Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="bg-card border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Enqoy
          </h1>
          <div className="flex gap-2">
            {profile?.role === "admin" && (
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {announcements.length > 0 && (
          <section className="relative rounded-xl overflow-hidden shadow-elevated">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroDining})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
            <div className="relative z-10 px-8 py-16 md:py-24 max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                {announcements[0].title}
              </h2>
              <p className="text-lg text-white/90 mb-8 drop-shadow-lg leading-relaxed">
                {announcements[0].body}
              </p>
              <Button size="lg" onClick={() => navigate("/events")} className="shadow-lg">
                Explore Events
              </Button>
            </div>
          </section>
        )}

        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Upcoming Events</h2>
            <p className="text-muted-foreground">Check out what's coming up next</p>
          </div>
          
          {upcomingEvents.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">
                  No upcoming events available at the moment.
                </p>
                <Button onClick={() => navigate("/events")}>
                  Browse All Events
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {isMobile && upcomingEvents.length > 1 ? (
                <Carousel className="w-full mb-4">
                  <CarouselContent>
                    {upcomingEvents.map((event) => (
                      <CarouselItem key={event.id}>
                        <Card
                          className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer"
                          onClick={() => navigate(`/events/${event.id}`)}
                        >
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <CardTitle>{event.title}</CardTitle>
                              <Badge>{event.type}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span>{format(new Date(event.date_time), "PPP 'at' p")}</span>
                            </div>
                            {event.venues && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-primary" />
                                <span>{event.venues.name}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-4">
                              <span className="text-lg font-semibold text-primary">
                                {event.price} ETB
                              </span>
                              <Button size="sm" variant="secondary">
                                View Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </Carousel>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  {upcomingEvents.map((event) => (
                    <Card
                      key={event.id}
                      className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle>{event.title}</CardTitle>
                          <Badge>{event.type}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{format(new Date(event.date_time), "PPP 'at' p")}</span>
                        </div>
                        {event.venues && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span>{event.venues.name}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-lg font-semibold text-primary">
                            {event.price} ETB
                          </span>
                          <Button size="sm" variant="secondary">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <div className="flex justify-center">
                <Button onClick={() => navigate("/events")} variant="outline" size="lg">
                  <Users className="h-4 w-4 mr-2" />
                  Browse All Events
                </Button>
              </div>
            </>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">My upcoming events</h2>
          {upcomingBookings.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">
                  No upcoming events yet. Book your first event!
                </p>
                <Button onClick={() => navigate("/events")}>
                  Explore Events
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingBookings.map((booking) => (
                <Card
                  key={booking.id}
                  className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer"
                  onClick={() => navigate(`/events/${booking.events.id}`)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{booking.events.title}</CardTitle>
                      <Badge>{booking.events.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>{format(new Date(booking.events.date_time), "PPP 'at' p")}</span>
                    </div>
                    {booking.events.venues && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{booking.events.venues.name}</span>
                      </div>
                    )}
                    <Badge variant="secondary" className="mt-2">
                      {booking.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {pastBookings.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Past Events</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {pastBookings.map((booking) => (
                <Card key={booking.id} className="shadow-card opacity-75">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{booking.events.title}</CardTitle>
                      <Badge variant="outline">{booking.events.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(booking.events.date_time), "PPP")}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/events/${booking.events.id}/feedback`);
                      }}
                    >
                      Give us feedback
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
