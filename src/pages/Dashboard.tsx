import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, LogOut, Settings, User, ChevronDown, Ticket, ClipboardList, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import heroDining from "@/assets/hero-dining.jpg";
import { getCurrentTime } from "@/utils/time";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, useCarousel } from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { eventsApi, bookingsApi, settingsApi, announcementsApi, pairingApi } from "@/api";
import { WelcomeBannerSettings } from "@/api/settings";

interface Announcement {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
}

interface Event {
  id: string;
  title: string;
  type: string;
  eventType?: string;
  dateTime: string;
  startTime?: string;
  price: number;
  venue: { name: string } | null;
}

interface Booking {
  id: string;
  status: string;
  event: Event;
  restaurantAssignment?: {
    hasAssignment: boolean;
    groupName?: string;
    restaurant?: {
      id: string;
      name: string;
      address?: string;
      contactInfo?: string;
    };
    status?: string;
  };
}

interface UpcomingEvent {
  id: string;
  title: string;
  type: string;
  eventType?: string;
  dateTime: string;
  startTime?: string;
  price: number;
  venue: { name: string } | null;
  bookingCutoffHours?: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, logout } = useAuth();
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [welcomeBanner, setWelcomeBanner] = useState<WelcomeBannerSettings>({
    title: "Welcome to Enqoy!",
    subtitle: "Discover curated dining experiences with interesting people",
    buttonText: "Explore Events",
    buttonLink: "/events",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pairingUpdates, setPairingUpdates] = useState<{
    hasPairingUpdates: boolean;
    eventsWithUpdates: Array<{ eventId: string; eventTitle: string; eventStartTime: string }>;
  }>({ hasPairingUpdates: false, eventsWithUpdates: [] });
  const [carouselApi, setCarouselApi] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Redirect based on user's country status
  useEffect(() => {
    if (user?.profile?.country) {
      if (!user.profile.country.isActive) {
        // Inactive countries go to Coming Soon page
        navigate("/coming-soon", { replace: true });
      } else if (user.profile.country.code === 'ET') {
        // Ethiopia redirects to Framer website
        window.location.replace("https://beta.enqoy.com/");
      }
      // Rwanda and other active countries stay on Dashboard
    }
  }, [user, navigate]);

  // Prevent rendering dashboard content if we're going to redirect
  if (user?.profile?.country && (
    !user.profile.country.isActive ||
    user.profile.country.code === 'ET'
  )) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // Auto-cycle announcements
  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAnnouncementIndex((prev) =>
        prev === announcements.length - 1 ? 0 : prev + 1
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  // Track carousel changes and handle navigation to events page
  useEffect(() => {
    if (!carouselApi) return;

    const onSelect = () => {
      const selectedIndex = carouselApi.selectedScrollSnap();
      setCurrentSlide(selectedIndex);
    };

    carouselApi.on("select", onSelect);
    onSelect();

    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi, upcomingEvents.length]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      if (!user) return;

      // Fetch bookings with events
      const bookings = await bookingsApi.getMy();

      if (bookings && bookings.length > 0) {
        // Use getCurrentTime for time travel support (pass first event's date as reference)
        const now = bookings.length > 0 ? getCurrentTime(bookings[0].event.startTime) : new Date();
        const upcoming = bookings.filter((b: any) => b.event.startTime && new Date(b.event.startTime) > now);
        const past = bookings.filter((b: any) => b.event.startTime && new Date(b.event.startTime) <= now);

        // Fetch restaurant assignments for upcoming bookings
        const upcomingWithAssignments = await Promise.all(
          upcoming.map(async (booking: any) => {
            try {
              const assignment = await pairingApi.getMyAssignment(booking.event.id);
              return { ...booking, restaurantAssignment: assignment };
            } catch (error) {
              // No assignment yet, that's okay
              return booking;
            }
          })
        );

        setUpcomingBookings(upcomingWithAssignments);
        setPastBookings(past);
      }

      // Fetch upcoming events (next 2) - filter out events with closed bookings AND events user has already booked
      const eventsData = await eventsApi.getUpcoming();
      const now = new Date();

      // Get IDs of events the user has already booked (confirmed or pending)
      const usersBookedEventIds = (bookings || []).map((b: any) => b.event.id || b.eventId);

      const openEvents = eventsData.filter((event: UpcomingEvent) => {
        // 1. Don't show if user already booked it
        if (usersBookedEventIds.includes(event.id)) return false;

        // 2. Don't show if missing start time
        if (!event.startTime) return true;

        // 3. Don't show if booking window is closed
        const eventStart = new Date(event.startTime);
        const cutoffHours = event.bookingCutoffHours ?? 24;
        const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

        return hoursUntilEvent >= cutoffHours; // Only show events still open for booking
      });
      // Fetch top 3 events (allows for 3rd click navigation to full list)
      setUpcomingEvents(openEvents.slice(0, 3) || []);

      // Fetch announcements
      try {
        const announcementsData = await announcementsApi.getActive();
        setAnnouncements(announcementsData || []);
      } catch (e) {
        // No announcements
      }

      // Fetch welcome banner settings (fallback)
      try {
        const bannerData = await settingsApi.getWelcomeBanner();
        setWelcomeBanner(bannerData);
      } catch (e) {
        // Use defaults if settings not found
      }

      // Check for pairing updates
      try {
        const pairingData = await pairingApi.hasPairingUpdates();
        setPairingUpdates(pairingData);
      } catch (e) {
        // No pairing updates or error
      }
    } catch (error: any) {
      toast.error("Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    logout();
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      <header className="bg-card border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Enqoy
          </h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 h-auto py-2 px-3 hover:bg-muted">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {user?.profile?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    {user?.profile?.lastName?.[0]?.toUpperCase() || ""}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">
                    {user?.profile?.firstName && user?.profile?.lastName
                      ? `${user.profile.firstName} ${user.profile.lastName}`
                      : user?.profile?.firstName || user?.email?.split("@")[0] || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.profile?.firstName && user?.profile?.lastName
                      ? `${user.profile.firstName} ${user.profile.lastName}`
                      : user?.profile?.firstName || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              {(user?.profile?.eventCredits || 0) > 0 && (
                <DropdownMenuItem
                  className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 focus:bg-green-100 dark:focus:bg-green-900/30 cursor-pointer"
                  onClick={() => navigate("/my-credits")}
                >
                  <Ticket className="mr-2 h-4 w-4" />
                  {user?.profile?.eventCredits} Event Credit{user?.profile?.eventCredits > 1 ? 's' : ''}
                </DropdownMenuItem>
              )}
              {user?.roles?.some((r: any) => r.role === "admin" || r.role === "super_admin") && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">

        {/* Assessment Reminder Banner - Shows if assessment not completed */}
        {!user?.profile?.assessmentCompleted && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Complete Your Personality Profile
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Required to book events and get matched with compatible groups
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 flex-shrink-0"
                onClick={() => navigate("/assessment")}
              >
                Complete Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pairing Update Banner - Shows when group pairings have changed */}
        {pairingUpdates.hasPairingUpdates && pairingUpdates.eventsWithUpdates.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Venue Details Updated
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {pairingUpdates.eventsWithUpdates.length === 1
                      ? `Check your restaurant assignment for ${pairingUpdates.eventsWithUpdates[0].eventTitle}`
                      : `You have new pairings for ${pairingUpdates.eventsWithUpdates.length} events`}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 flex-shrink-0"
                onClick={() => {
                  if (pairingUpdates.eventsWithUpdates.length === 1) {
                    navigate(`/events/${pairingUpdates.eventsWithUpdates[0].eventId}`);
                  } else {
                    // Scroll to "My upcoming events" section
                    window.scrollTo({ top: 600, behavior: 'smooth' });
                  }
                }}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Hero Banner - Shows announcements or fallback welcome message */}
        <section className="relative rounded-xl overflow-hidden shadow-elevated">
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-500"
            style={{
              backgroundImage: announcements.length > 0 && announcements[currentAnnouncementIndex]?.imageUrl
                ? `url(${announcements[currentAnnouncementIndex].imageUrl})`
                : welcomeBanner.backgroundImage
                  ? `url(${welcomeBanner.backgroundImage})`
                  : `url(${heroDining})`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
          <div className="relative z-10 px-8 py-16 md:py-24 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
              {announcements.length > 0
                ? announcements[currentAnnouncementIndex]?.title
                : welcomeBanner.title}
            </h2>
            <p className="text-lg text-white/90 mb-8 drop-shadow-lg leading-relaxed">
              {announcements.length > 0
                ? announcements[currentAnnouncementIndex]?.message
                : welcomeBanner.subtitle}
            </p>
            <Button size="lg" onClick={() => navigate(welcomeBanner.buttonLink)} className="shadow-lg">
              {welcomeBanner.buttonText}
            </Button>

            {/* Dot indicators for multiple announcements */}
            {announcements.length > 1 && (
              <div className="flex gap-2 mt-6">
                {announcements.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentAnnouncementIndex(index)}
                    className={`h-2 rounded-full transition-all ${index === currentAnnouncementIndex
                      ? "w-6 bg-white"
                      : "w-2 bg-white/50 hover:bg-white/70"
                      }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

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
              <Carousel
                className="w-full mb-4"
                setApi={setCarouselApi}
                opts={{
                  align: "start",
                  slidesToScroll: 1,
                }}
              >
                <CarouselContent className="-ml-4">
                  {upcomingEvents.map((event) => (
                    <CarouselItem key={event.id} className="pl-4 basis-full">
                      <Card
                        className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer"
                        onClick={() => navigate(`/events/${event.id}`)}
                      >
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle>{event.title}</CardTitle>
                            <Badge>{event.eventType || event.type}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span>{event.startTime ? format(new Date(event.startTime), "PPP 'at' p") : 'Date TBA'}</span>
                          </div>
                          {event.venue && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span>{event.venue.name}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-4">
                            <span className="text-lg font-semibold text-primary">
                              {event.price} Birr
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
                {carouselApi && (() => {
                  // With 1 card per slide, we have 2 slides total (2 events)
                  // After seeing the second card (currentSlide >= 1), next click should navigate
                  const isAtLastSlide = currentSlide >= upcomingEvents.length - 1;

                  if (isAtLastSlide) {
                    return (
                      <Button
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                        variant="outline"
                        size="icon"
                        onClick={() => navigate("/events")}
                      >
                        <ArrowRight className="h-4 w-4" />
                        <span className="sr-only">View all events</span>
                      </Button>
                    );
                  }

                  return <CarouselNext className="right-2" />;
                })()}
                {!carouselApi && <CarouselNext className="right-2" />}
              </Carousel>

              <div className="flex justify-center mt-4">
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
                  onClick={() => navigate(`/events/${booking.event.id}`)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{booking.event.title}</CardTitle>
                      <Badge>{booking.event.eventType || booking.event.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>{booking.event.startTime ? format(new Date(booking.event.startTime), "PPP 'at' p") : 'Date TBA'}</span>
                    </div>
                    {booking.event.venue && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{booking.event.venue.name}</span>
                      </div>
                    )}
                    {booking.restaurantAssignment?.hasAssignment && booking.restaurantAssignment.restaurant && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2 text-sm font-semibold text-accent mb-1">
                          <Users className="h-4 w-4" />
                          <span>Your Restaurant Assignment</span>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          <span className="font-medium text-foreground">{booking.restaurantAssignment.restaurant.name}</span>
                        </p>
                        {booking.restaurantAssignment.restaurant.address && (
                          <p className="text-xs text-muted-foreground ml-6 mt-1">
                            {booking.restaurantAssignment.restaurant.address}
                          </p>
                        )}
                      </div>
                    )}
                    <Badge
                      variant={booking.status === "confirmed" ? "default" : "secondary"}
                      className={`mt-2 ${booking.status === "confirmed" ? "bg-green-500 hover:bg-green-600" : booking.status === "pending" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}`}
                    >
                      {booking.status === "confirmed" ? "Confirmed" : booking.status === "pending" ? "Pending Payment" : booking.status}
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
                      <CardTitle>{booking.event.title}</CardTitle>
                      <Badge variant="outline">{booking.event.eventType || booking.event.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{booking.event.startTime ? format(new Date(booking.event.startTime), "PPP") : 'Date TBA'}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/events/${booking.event.id}/feedback`);
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

      <footer className="bg-card border-t mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <h3 className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Enqoy
              </h3>
              <p className="text-sm text-muted-foreground">
                Building meaningful connections through shared experiences
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <button
                onClick={() => navigate("/terms")}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Terms & Conditions
              </button>
              <button
                onClick={() => navigate("/faq")}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                FAQs
              </button>
              <button
                onClick={() => navigate("/community-guidelines")}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Community Guidelines
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Enqoy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div >
  );
};

export default Dashboard;
