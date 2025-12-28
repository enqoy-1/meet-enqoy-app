import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, ArrowLeft, DollarSign, Users, ChevronRight, ChevronLeft, MoreVertical, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInHours, isSameDay } from "date-fns";
import { getCurrentTime } from "@/utils/time";
import { IceBreakerGame } from "@/components/IceBreakerGame";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useAuth } from "@/contexts/AuthContext";
import { eventsApi, bookingsApi, icebreakersApi, pairingApi } from "@/api";
import { BringFriendDialog } from "@/components/BringFriendDialog";
import { BookingModal } from "@/components/BookingModal";
import { PaymentModal } from "@/components/PaymentModal";

interface Event {
  id: string;
  title: string;
  eventType: string;
  description: string;
  startTime: string;
  price: number;
  venueId: string | null;
  bookingCutoffHours?: number;
  venue: {
    name: string;
    address: string;
    city?: string;
    googleMapsUrl: string;
  } | null;
}

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [booking, setBooking] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [isBringFriendDialogOpen, setIsBringFriendDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
  const [selectedNewEventId, setSelectedNewEventId] = useState<string>("");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [isAssessmentPromptOpen, setIsAssessmentPromptOpen] = useState(false);
  const [restaurantAssignment, setRestaurantAssignment] = useState<any>(null);

  // Check if event is within booking cutoff window
  const isWithinCutoff = () => {
    if (!event) return false;
    const cutoffHours = event.bookingCutoffHours ?? 48; // Default to 48 if not set
    const now = new Date();
    const eventStartTime = new Date(event.startTime);
    const hoursUntilEvent = (eventStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilEvent < cutoffHours;
  };

  // Get cutoff hours for display
  const getCutoffHours = () => event?.bookingCutoffHours ?? 48;

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch event
      const eventData = await eventsApi.getById(id!);
      setEvent(eventData);

      // Check if user has booked this event
      const myBookings = await bookingsApi.getMy();
      const bookingData = myBookings.find((b: any) => b.eventId === id && b.status === "confirmed");
      setBooking(bookingData);

      if (bookingData) {
        const now = getCurrentTime(eventData.startTime);
        const hoursUntilEvent = differenceInHours(new Date(eventData.startTime), now);

        // Fetch snapshot if within 24 hours (Note: API endpoint might be needed)
        // For now, skip snapshot fetching until API endpoint is available
        if (hoursUntilEvent <= 24) {
          // TODO: Add snapshot API endpoint
          // const snapshotData = await snapshotsApi.getByEventId(id);
          // setSnapshot(snapshotData?.snapshotText);
        }

        // Fetch icebreaker questions if event has started
        if (hoursUntilEvent <= 0) {
          const questionsData = await icebreakersApi.getActive();
          setQuestions(questionsData || []);
        }

        // Fetch restaurant assignment
        try {
          const assignmentData = await pairingApi.getMyAssignment(id!);
          if (assignmentData.hasAssignment) {
            setRestaurantAssignment(assignmentData);
          }
        } catch (error) {
          // No assignment yet or error fetching - silently ignore
          console.log("No restaurant assignment available");
        }
      }
    } catch (error: any) {
      toast.error("Failed to load event details");
      navigate("/events");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenBookingModal = () => {
    // Check if assessment is complete before allowing booking
    if (!user?.profile?.assessmentCompleted) {
      setIsAssessmentPromptOpen(true);
      return;
    }

    // Get user credits from profile
    const credits = user?.profile?.eventCredits || 0;
    setUserCredits(credits);
    setIsBookingModalOpen(true);
  };

  const handleBookingSuccess = async (bookingResult?: any) => {
    // Refresh to get the new booking
    await fetchEventDetails();

    // Use the passed booking result if available, otherwise fetch
    let newBooking = bookingResult;

    if (!newBooking) {
      const myBookings = await bookingsApi.getMy();
      newBooking = myBookings.find((b: any) => b.eventId === id && b.status !== 'cancelled');
    }

    if (newBooking && newBooking.paymentStatus !== 'credit_used' && newBooking.status !== 'confirmed') {
      // Open payment modal if not paid with credit AND not confirmed
      setPendingBookingId(newBooking.id);
      setPendingAmount(Number(newBooking.amountPaid) || Number(event?.price) || 500);
      setIsPaymentModalOpen(true);
    } else {
      // If paid with credit or already confirmed (e.g. friend paid), show success
      setIsSuccessDialogOpen(true);
    }
  };

  const handlePaymentSuccess = (result?: any) => {
    setIsPaymentModalOpen(false);

    // Only show "Booking Confirmed" dialog if payment was auto-verified
    if (result?.autoVerified) {
      setIsSuccessDialogOpen(true);
    } else {
      // Otherwise, the toast in PaymentModal already informed them it's pending
      // We could optionally show a different dialog here like "Payment Pending"
      // For now, just close the modal and let the toast be the feedback
    }
  };

  const handleBookEvent = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setIsBookingModalOpen(true);
  };

  const handleCancelBooking = async () => {
    if (!booking || !event) return;

    const now = getCurrentTime(event.startTime);
    const hoursUntilEvent = differenceInHours(new Date(event.startTime), now);

    // Policy: Up to cutoff hours before the event
    const cutoffHours = getCutoffHours();
    if (hoursUntilEvent < cutoffHours) {
      toast.error(`Cancellations are only allowed up to ${cutoffHours} hours before the event`);
      return;
    }

    try {
      await bookingsApi.cancel(booking.id);
      toast.success("Booking cancelled");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error("Failed to cancel booking");
    }
  };

  const fetchAvailableEvents = async () => {
    try {
      const data = await eventsApi.getUpcoming();
      // Filter to exclude current event and match price
      const filtered = data.filter((e: Event) => e.id !== id && e.price === event?.price);
      setAvailableEvents(filtered || []);
    } catch (error: any) {
      toast.error("Failed to load available events");
    }
  };

  const handleOpenReschedule = async () => {
    const now = getCurrentTime(event!.startTime);
    const hoursUntilEvent = differenceInHours(new Date(event!.startTime), now);

    // Policy: Up to cutoff hours before the event
    const cutoffHours = getCutoffHours();
    if (hoursUntilEvent < cutoffHours) {
      toast.error(`Rescheduling is only allowed up to ${cutoffHours} hours before the event`);
      return;
    }

    await fetchAvailableEvents();
    setIsRescheduleDialogOpen(true);
  };

  const handleRescheduleBooking = async () => {
    if (!booking || !selectedNewEventId) return;

    try {
      const newEventData = await eventsApi.getById(selectedNewEventId);

      // Update the booking
      await bookingsApi.update(booking.id, {
        eventId: selectedNewEventId,
        status: "rescheduled",
        amountPaid: newEventData.price
      });

      toast.success("Booking rescheduled successfully!");
      setIsRescheduleDialogOpen(false);
      navigate(`/events/${selectedNewEventId}`);
    } catch (error: any) {
      toast.error("Failed to reschedule booking");
    }
  };

  if (isLoading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading event...</div>
      </div>
    );
  }

  const now = getCurrentTime(event.startTime);
  const hoursUntilEvent = differenceInHours(new Date(event.startTime), now);
  // Check if user is admin
  const isAdmin = user?.roles?.some((r: any) => r.role === 'admin' || r.role === 'super_admin');

  // Show venue if:
  // 1. User has a booking AND
  // 2. Venue is assigned AND
  // 3. (It is within cutoff hours OR user is admin)
  const cutoffHours = getCutoffHours();
  const showVenue = booking && !!event.venue && (hoursUntilEvent <= cutoffHours || isAdmin);
  const showSnapshot = booking && snapshot && hoursUntilEvent <= 24;
  const showIcebreakers = booking && questions.length > 0 && hoursUntilEvent <= 0;
  const isEventToday = booking && isSameDay(new Date(event.startTime), now);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/events")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="shadow-elevated">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-3xl">{event.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-base">{event.eventType}</Badge>
                {booking && hoursUntilEvent >= cutoffHours && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover z-50">
                      <DropdownMenuItem onClick={handleOpenReschedule}>
                        Reschedule Booking
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCancelBooking} className="text-destructive">
                        Cancel Booking
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            {event.description && (
              <CardDescription className="text-base mt-4">
                {event.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">{event.startTime ? format(new Date(event.startTime), "PPPP") : 'Date TBA'}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.startTime ? format(new Date(event.startTime), "p") : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">${event.price}</p>
                  <p className="text-sm text-muted-foreground">Per person</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  {showVenue && event.venue ? (
                    <>
                      <p className="font-semibold">{event.venue.name}</p>
                      <p className="text-sm text-muted-foreground">{event.venue.address}</p>
                      {event.venue.googleMapsUrl && (
                        <a
                          href={event.venue.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View on Google Maps
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      Location will be revealed {cutoffHours} hours before the event
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Restaurant Assignment Card */}
            {booking && restaurantAssignment && restaurantAssignment.restaurant && (
              <Card className="bg-accent/10 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Your Restaurant Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Restaurant</p>
                    <p className="font-semibold">{restaurantAssignment.restaurant.name}</p>
                  </div>
                  {restaurantAssignment.restaurant.address && (
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="text-sm">{restaurantAssignment.restaurant.address}</p>
                    </div>
                  )}
                  {restaurantAssignment.restaurant.contactInfo && (
                    <div>
                      <p className="text-sm text-muted-foreground">Contact</p>
                      <p className="text-sm">{restaurantAssignment.restaurant.contactInfo}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {showSnapshot && (
              <Card className="bg-accent/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Who's Coming
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{snapshot}</p>
                </CardContent>
              </Card>
            )}

            {showIcebreakers && (
              <Card className="bg-accent/10">
                <CardHeader>
                  <CardTitle className="text-lg">Icebreaker Questions</CardTitle>
                  <CardDescription>
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-lg">{questions[currentQuestionIndex]?.questionText}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                      disabled={currentQuestionIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                      disabled={currentQuestionIndex === questions.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex gap-3 flex-col sm:flex-row">
                {booking ? (
                  <Badge variant="secondary" className="text-base py-2 px-4">
                    Booking Confirmed
                  </Badge>
                ) : isWithinCutoff() ? (
                  <div className="flex flex-col gap-2">
                    <Button disabled size="lg" className="w-full sm:w-auto" variant="secondary">
                      Booking Closed
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Bookings close {cutoffHours} hours before the event
                    </p>
                  </div>
                ) : (
                  <Button onClick={handleOpenBookingModal} size="lg" className="w-full sm:w-auto">
                    Book This Event - {event.price} ETB
                  </Button>
                )}
              </div>

              {booking && hoursUntilEvent > cutoffHours && (
                <Button
                  onClick={() => setIsBringFriendDialogOpen(true)}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Bring a Friend
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Ice Breaker Game CTA - Fixed Bottom */}
      {isEventToday && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border z-40">
          <div className="container mx-auto max-w-3xl">
            <Button
              onClick={() => setIsGameOpen(true)}
              size="lg"
              className="w-full text-lg py-6 shadow-elevated"
            >
              Ice Breakers
            </Button>
          </div>
        </div>
      )}

      {/* Ice Breaker Game Modal */}
      <IceBreakerGame
        isOpen={isGameOpen}
        onClose={() => setIsGameOpen(false)}
        eventId={event.id}
      />

      {/* Bring a Friend Dialog */}
      <BringFriendDialog
        isOpen={isBringFriendDialogOpen}
        onClose={() => setIsBringFriendDialogOpen(false)}
        eventId={event.id}
        eventPrice={Number(event.price)}
      />

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        event={{
          id: event.id,
          title: event.title,
          price: Number(event.price),
          startTime: event.startTime,
        }}
        onSuccess={handleBookingSuccess}
        userCredits={userCredits}
      />

      {/* Payment Modal */}
      {pendingBookingId && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          bookingId={pendingBookingId}
          amount={pendingAmount}
          eventTitle={event.title}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Reschedule Your Booking</DialogTitle>
            <DialogDescription>
              Select a new event date to reschedule your booking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select New Event</label>
              <Select value={selectedNewEventId} onValueChange={setSelectedNewEventId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Choose an event" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {availableEvents.map((evt) => (
                    <SelectItem key={evt.id} value={evt.id}>
                      {evt.title} - {evt.startTime ? format(new Date(evt.startTime), "PPP") : 'Date TBA'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedNewEventId && availableEvents.find(e => e.id === selectedNewEventId) && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>New Event:</strong> {availableEvents.find(e => e.id === selectedNewEventId)?.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Date:</strong> {availableEvents.find(e => e.id === selectedNewEventId)?.startTime ? format(new Date(availableEvents.find(e => e.id === selectedNewEventId)!.startTime), "PPPP") : 'Date TBA'}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Price:</strong> ${availableEvents.find(e => e.id === selectedNewEventId)?.price}
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsRescheduleDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRescheduleBooking}
                disabled={!selectedNewEventId}
                className="flex-1"
              >
                Confirm Reschedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Booking Confirmed!</DialogTitle>
            <DialogDescription className="text-center space-y-4 pt-4">
              <p className="text-lg font-semibold text-foreground">
                You've successfully booked {event?.title}
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-left">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Event:</span>
                  <span className="font-medium">{event?.title}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{event?.startTime ? format(new Date(event.startTime), "PPP 'at' p") : 'TBA'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-medium">${event?.price}</span>
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                A confirmation email has been sent to your inbox with all the event details.
              </p>
              <p className="text-sm text-muted-foreground">
                The venue location will be revealed {cutoffHours} hours before the event.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={() => setIsSuccessDialogOpen(false)} size="lg">
              Great! Let's Go
            </Button>
            {hoursUntilEvent > cutoffHours && (
              <Button
                variant="outline"
                onClick={() => {
                  setIsSuccessDialogOpen(false);
                  setIsBringFriendDialogOpen(true);
                }}
              >
                Bring a Friend
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assessment Required Dialog */}
      <Dialog open={isAssessmentPromptOpen} onOpenChange={setIsAssessmentPromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-amber-100 p-3">
                <ClipboardList className="h-10 w-10 text-amber-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Complete Your Profile First</DialogTitle>
            <DialogDescription className="text-center space-y-3 pt-4">
              <p>
                To book this event, we need to learn a bit about you so we can match you with compatible groups for the best experience.
              </p>
              <p className="text-sm text-muted-foreground">
                It only takes about 5 minutes to complete your personality profile.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={() => {
                setIsAssessmentPromptOpen(false);
                navigate("/assessment");
              }}
              size="lg"
            >
              Complete Profile Now
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsAssessmentPromptOpen(false)}
            >
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDetail;
