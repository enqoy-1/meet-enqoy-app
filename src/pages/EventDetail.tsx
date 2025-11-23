import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, ArrowLeft, DollarSign, Users, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInHours } from "date-fns";

interface Event {
  id: string;
  title: string;
  type: string;
  description: string;
  date_time: string;
  price: number;
  venue_id: string | null;
  venues: {
    name: string;
    address: string;
    google_maps_link: string;
  } | null;
}

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [booking, setBooking] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);

      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(`
          *,
          venues (
            name,
            address,
            google_maps_link
          )
        `)
        .eq("id", id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Check if user has booked this event
      const { data: bookingData } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .eq("event_id", id)
        .eq("status", "confirmed")
        .maybeSingle();

      setBooking(bookingData);

      if (bookingData) {
        const hoursUntilEvent = differenceInHours(new Date(eventData.date_time), new Date());

        // Fetch snapshot if within 24 hours
        if (hoursUntilEvent <= 24) {
          const { data: snapshotData } = await supabase
            .from("attendee_snapshots")
            .select("snapshot_text")
            .eq("event_id", id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (snapshotData) {
            setSnapshot(snapshotData.snapshot_text);
          }
        }

        // Fetch icebreaker questions if event has started
        if (hoursUntilEvent <= 0) {
          const { data: questionsData } = await supabase
            .from("icebreaker_questions")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

          setQuestions(questionsData || []);
        }
      }
    } catch (error: any) {
      toast.error("Failed to load event details");
      navigate("/events");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookEvent = async () => {
    if (!userId || !event) return;

    try {
      // Generate secure payment reference on backend
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'generate-payment-reference'
      );

      if (paymentError || !paymentData?.paymentReference) {
        throw new Error('Failed to generate payment reference');
      }

      const { error } = await supabase.from("bookings").insert({
        user_id: userId,
        event_id: event.id,
        status: "confirmed",
        amount_paid: event.price,
        payment_reference: paymentData.paymentReference,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("You've already booked this event");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Event booked successfully!");
      fetchEventDetails();
    } catch (error: any) {
      toast.error(error.message || "Failed to book event");
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !event) return;

    const hoursUntilEvent = differenceInHours(new Date(event.date_time), new Date());
    
    if (hoursUntilEvent < 48) {
      toast.error("Cannot cancel within 48 hours of the event");
      return;
    }

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id);

      if (error) throw error;

      toast.success("Booking cancelled");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error("Failed to cancel booking");
    }
  };

  if (isLoading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading event...</div>
      </div>
    );
  }

  const hoursUntilEvent = differenceInHours(new Date(event.date_time), new Date());
  const showVenue = booking && hoursUntilEvent <= 48;
  const showSnapshot = booking && snapshot && hoursUntilEvent <= 24;
  const showIcebreakers = booking && questions.length > 0 && hoursUntilEvent <= 0;

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
              <CardTitle className="text-3xl">{event.title}</CardTitle>
              <Badge className="text-base">{event.type}</Badge>
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
                  <p className="font-semibold">{format(new Date(event.date_time), "PPPP")}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(event.date_time), "p")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">{event.price} ETB</p>
                  <p className="text-sm text-muted-foreground">Per person</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  {showVenue && event.venues ? (
                    <>
                      <p className="font-semibold">{event.venues.name}</p>
                      <p className="text-sm text-muted-foreground">{event.venues.address}</p>
                      {event.venues.google_maps_link && (
                        <a
                          href={event.venues.google_maps_link}
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
                      Location will be revealed 48 hours before the event
                    </p>
                  )}
                </div>
              </div>
            </div>

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
                  <p className="text-lg">{questions[currentQuestionIndex]?.question_text}</p>
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

            <div className="flex gap-3">
              {booking ? (
                <>
                  <Badge variant="secondary" className="text-base py-2 px-4">
                    Booking Confirmed
                  </Badge>
                  {hoursUntilEvent >= 48 && (
                    <Button variant="destructive" onClick={handleCancelBooking}>
                      Cancel Booking
                    </Button>
                  )}
                </>
              ) : (
                <Button onClick={handleBookEvent} size="lg" className="w-full sm:w-auto">
                  Book This Event - {event.price} ETB
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EventDetail;
