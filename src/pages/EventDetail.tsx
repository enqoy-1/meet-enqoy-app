import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, ArrowLeft, Users, ChevronRight, ChevronLeft, MoreVertical, ClipboardList, MessageCircle, Home, Check, Banknote } from "lucide-react";
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
  createdAt?: string;
  updatedAt?: string;
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
    const cutoffHours = event.bookingCutoffHours ?? 24; // Default to 24 if not set
    const now = new Date();
    const eventStartTime = new Date(event.startTime);
    const hoursUntilEvent = (eventStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilEvent < cutoffHours;
  };

  // Get cutoff hours for display (default 24 hours)
  const getCutoffHours = () => event?.bookingCutoffHours ?? 24;

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
      console.log('🔍 Checking bookings for event', id, myBookings);

      const bookingData = myBookings.find((b: any) => {
        const matchesEvent = (b.eventId === id) || (b.event && b.event.id === id);
        // Include pending, confirmed, and rescheduled. Treat 'pending' as a valid booking state to show details.
        // Also check if payment status indicates an active booking attempt
        const isActiveStatus = ["confirmed", "pending", "rescheduled"].includes(b.status);
        return matchesEvent && isActiveStatus;
      });

      if (bookingData) {
        console.log('✅ Found active booking:', bookingData.status, bookingData.id);
      } else {
        console.log('❌ No active booking found for this event. User bookings count:', myBookings?.length);
      }

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
      // Use the dedicated reschedule endpoint which cancels old + creates new
      await bookingsApi.reschedule(booking.id, selectedNewEventId);

      toast.success("Booking rescheduled successfully!");
      setIsRescheduleDialogOpen(false);
      navigate(`/events/${selectedNewEventId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reschedule booking");
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

  // Check if venue was set at event creation time
  // We consider venue set at creation if:
  // 1. Event was created recently (within 48 hours) and has a venue, OR
  // 2. createdAt and updatedAt are very close (within 10 minutes), indicating minimal edits
  const isVenueSetAtCreation = (): boolean => {
    if (!event.venueId) return false;

    // If we don't have timestamps, we can't determine, so return false to use default behavior
    if (!event.createdAt) return false;

    const createdAt = new Date(event.createdAt);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // If event was created within 48 hours and has a venue, assume venue was set at creation
    if (hoursSinceCreation <= 48) {
      return true;
    }

    // Otherwise, check if updatedAt is close to createdAt (within 10 minutes)
    if (event.updatedAt) {
      const updatedAt = new Date(event.updatedAt);
      const diffMinutes = Math.abs((updatedAt.getTime() - createdAt.getTime()) / (1000 * 60));
      return diffMinutes <= 10;
    }

    return false;
  };

  // Show venue if:
  // 1. User has a booking AND
  // 2. Venue is assigned AND
  // 3. (Venue was set at creation time OR within cutoff hours OR user is admin)
  const cutoffHours = getCutoffHours();
  const venueSetAtCreation = isVenueSetAtCreation();
  const showVenue = booking && !!event.venue && (venueSetAtCreation || hoursUntilEvent <= cutoffHours || isAdmin);
  const showSnapshot = booking && snapshot && hoursUntilEvent <= 24;
  const showIcebreakers = booking && questions.length > 0 && hoursUntilEvent <= 0;
  const isEventToday = booking && isSameDay(new Date(event.startTime), now);

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-slate-900">
      <header className="bg-[#f5f0e8] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-5">
          <Button variant="ghost" className="text-slate-700 hover:bg-white/60" onClick={() => navigate("/events")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-10 max-w-3xl space-y-4">
        {/* Main Event Card */}
        <Card className="shadow-lg rounded-2xl border border-[#ede5d5] bg-white">
          <CardContent className="p-6 md:p-7">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-base text-muted-foreground capitalize">Dinner</p>
                <h1 className="text-3xl font-semibold capitalize tracking-tight">{event.eventType}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-700 hover:bg-emerald-800 text-white capitalize px-3 py-1 rounded-full">
                  {event.eventType}
                </Badge>
                {booking && hoursUntilEvent >= cutoffHours && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border shadow-lg">
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

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-emerald-700 mt-0.5" />
                <div>
                  <p className="font-medium text-lg">
                    {event.startTime ? format(new Date(event.startTime), "EEEE, MMMM do, yyyy") : "Date TBA"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {event.startTime ? format(new Date(event.startTime), "h:mm a") : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Banknote className="h-5 w-5 text-emerald-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-lg">{event.price} Birr</p>
                  <p className="text-sm text-muted-foreground">Per person</p>
                </div>
              </div>

              {(!booking || !restaurantAssignment || !restaurantAssignment.restaurant) && (
                <div className="bg-[#f3ecda] text-slate-700 p-3 rounded-lg border border-[#e8dec6]">
                  <p className="text-sm">
                    Location details shared {cutoffHours} hours before the event
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Restaurant Assignment Card */}
        {booking && restaurantAssignment && restaurantAssignment.restaurant && (
          <Card className="bg-[#f3e8c9] border-none shadow-md rounded-2xl">
            <CardContent className="p-6 md:p-7 space-y-3">
              <p className="text-sm font-medium text-slate-700">Your Table & Restaurant</p>
              <h3 className="text-2xl font-semibold text-slate-900">{restaurantAssignment.restaurant.name}</h3>
              {restaurantAssignment.restaurant.address && (
                <p className="text-sm text-slate-700">{restaurantAssignment.restaurant.address}</p>
              )}
              {restaurantAssignment.restaurant.googleMapsUrl && (
                <>
                  <a
                    href={restaurantAssignment.restaurant.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-800 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    View on Google Maps
                  </a>
                  <div className="mt-4 rounded-xl overflow-hidden border border-[#e3d4ac]">
                    <iframe
                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(restaurantAssignment.restaurant.address || restaurantAssignment.restaurant.name)}`}
                      width="100%"
                      height="300"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Conversation Starters Card */}
        {booking && (
          <Card
            className="shadow-md rounded-2xl cursor-pointer hover:shadow-lg transition-shadow bg-white"
            onClick={() => navigate(`/events/${event.id}/conversation-starters`)}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <MessageCircle className="h-6 w-6 text-emerald-700 shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Conversation Starters</h3>
                  <p className="text-sm text-muted-foreground">Simple prompts to get the table talking.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* House Welcome & Guidelines Card */}
        {booking && (
          <Card
            className="shadow-md rounded-2xl cursor-pointer hover:shadow-lg transition-shadow bg-white"
            onClick={() => navigate(`/events/${event.id}/guidelines`)}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <Home className="h-6 w-6 text-emerald-700 shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">House Welcome & Guidelines</h3>
                  <p className="text-sm text-muted-foreground">How we show up to make the experience great for everyone.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Who's Coming Snapshot */}
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

        {/* Icebreaker Questions */}
        {showIcebreakers && (
          <Card className="bg-accent/10">
            <CardHeader>
              <CardTitle className="text-lg">Want handpicked prompts to help the conversation going?</CardTitle>
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

        {/* Booking Status Card - Confirmed */}
        {booking && booking.status === "confirmed" && (
          <Card className="bg-[#f3e8c9] border border-[#e8d8ac] shadow-md rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 rounded-full p-2">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-lg text-slate-900">Booking Confirmed</h3>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Status Card - Pending Payment */}
        {booking && booking.status === "pending" && (
          <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500 rounded-full p-2">
                    <Banknote className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Pending Payment Verification</h3>
                    <p className="text-sm text-muted-foreground">Your booking is reserved. Awaiting payment confirmation.</p>
                  </div>
                </div>
                {!isWithinCutoff() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPendingBookingId(booking.id);
                      setPendingAmount(Number(booking.amountPaid) || Number(event?.price) || 500);
                      setIsPaymentModalOpen(true);
                    }}
                  >
                    Upload Payment
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Book Event Button */}
        {!booking && !isWithinCutoff() && (
          <Button onClick={handleOpenBookingModal} size="lg" className="w-full">
            Book This Event - {event.price} ETB
          </Button>
        )}

        {/* Booking Closed Message */}
        {!booking && isWithinCutoff() && (
          <Card className="shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Bookings close {cutoffHours} hours before the event</p>
            </CardContent>
          </Card>
        )}

        {/* Bring a Friend Button */}
        {booking && hoursUntilEvent > cutoffHours && (
          <Button
            onClick={() => setIsBringFriendDialogOpen(true)}
            variant="outline"
            size="lg"
            className="w-full bg-white/80 hover:bg-white shadow-sm border border-[#e5dcc7] text-slate-800"
          >
            <Users className="h-4 w-4 mr-2" />
            Bring a Friend
          </Button>
        )}
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
        bookingCutoffHours={event.bookingCutoffHours}
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
          bookingCutoffHours: event.bookingCutoffHours,
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
                  <strong>Price:</strong> {availableEvents.find(e => e.id === selectedNewEventId)?.price} Birr
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
                  <span className="font-medium">{event?.price} Birr</span>
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                A confirmation email has been sent to your inbox with all the event details.
              </p>
              <p className="text-sm text-muted-foreground">
                {venueSetAtCreation
                  ? "The venue location is available now."
                  : `The venue location will be revealed ${cutoffHours} hours before the event.`}
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
