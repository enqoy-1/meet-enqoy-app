import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { eventsApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sparkles, Calendar, Users, ArrowRight, Heart, MessageCircle, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import useEmblaCarousel from "embla-carousel-react";
import heroDinnerTable from "@/assets/hero-dinner-group.jpg";
import heroDining from "@/assets/hero-dining.jpg";

interface Event {
  id: string;
  title: string;
  eventType: string;
  startTime: string;
  price: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  const fetchUpcomingEvents = async () => {
    try {
      const data = await eventsApi.getUpcoming();
      // Filter events 48 hours away and limit to 4
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() + 48);

      const filtered = data
        .filter((e: any) => new Date(e.startTime) >= cutoffTime)
        .slice(0, 4);

      setUpcomingEvents(filtered);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const getEventEmoji = (type: string) => {
    switch (type.toLowerCase()) {
      case "dinner": return "🍽️";
      case "lunch": return "🥗";
      case "scavenger_hunt": return "🔍";
      case "mixer": return "🎉";
      default: return "✨";
    }
  };

  const [emblaRefHowItWorks, emblaApiHowItWorks] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true
  });
  const [canScrollPrevHowItWorks, setCanScrollPrevHowItWorks] = useState(false);
  const [canScrollNextHowItWorks, setCanScrollNextHowItWorks] = useState(false);

  const [emblaRefTestimonials, emblaApiTestimonials] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true
  });
  const [canScrollPrevTestimonials, setCanScrollPrevTestimonials] = useState(false);
  const [canScrollNextTestimonials, setCanScrollNextTestimonials] = useState(false);

  useEffect(() => {
    if (!emblaApiHowItWorks) return;

    const onSelect = () => {
      setCanScrollPrevHowItWorks(emblaApiHowItWorks.canScrollPrev());
      setCanScrollNextHowItWorks(emblaApiHowItWorks.canScrollNext());
    };

    emblaApiHowItWorks.on('select', onSelect);
    emblaApiHowItWorks.on('reInit', onSelect);
    onSelect();

    return () => {
      emblaApiHowItWorks.off('select', onSelect);
      emblaApiHowItWorks.off('reInit', onSelect);
    };
  }, [emblaApiHowItWorks]);

  useEffect(() => {
    if (!emblaApiTestimonials) return;

    const onSelect = () => {
      setCanScrollPrevTestimonials(emblaApiTestimonials.canScrollPrev());
      setCanScrollNextTestimonials(emblaApiTestimonials.canScrollNext());
    };

    emblaApiTestimonials.on('select', onSelect);
    emblaApiTestimonials.on('reInit', onSelect);
    onSelect();

    return () => {
      emblaApiTestimonials.off('select', onSelect);
      emblaApiTestimonials.off('reInit', onSelect);
    };
  }, [emblaApiTestimonials]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4 py-16">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroDinnerTable})` }}
        />
        <div className="absolute inset-0 bg-primary/60" />

        <div className="container mx-auto max-w-4xl relative z-10 text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight drop-shadow-lg">
            Meet New People.<br />
            Share Great Conversations.
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-4 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            Enqoy connects you to small group lunches and dinners with people you'll actually enjoy meeting.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-base md:text-lg px-6 py-3 md:px-10 md:py-6 h-auto rounded-full shadow-elevated hover:shadow-[var(--shadow-elevated)] transition-all group"
            >
              Take the Assessment
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/events")}
              className="text-base md:text-lg px-6 py-3 md:px-10 md:py-6 h-auto rounded-full border-2 border-primary hover:bg-primary hover:text-white"
            >
              See Upcoming Events
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-primary">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to meaningful connections
            </p>
          </div>

          {/* Desktop: Grid */}
          <div className="hidden md:grid md:grid-cols-3 gap-8">
            <Card className="text-center shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all rounded-3xl border-2 border-border/50">
              <CardHeader className="pb-4 pt-8">
                <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-3">Take the Assessment</CardTitle>
                <CardDescription className="text-base leading-relaxed px-4">
                  Tell us a little about yourself so we can match you well.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all rounded-3xl border-2 border-border/50">
              <CardHeader className="pb-4 pt-8">
                <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6">
                  <Calendar className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-3">Book a Dinner or Lunch</CardTitle>
                <CardDescription className="text-base leading-relaxed px-4">
                  Choose from curated events happening every week.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all rounded-3xl border-2 border-border/50">
              <CardHeader className="pb-4 pt-8">
                <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6">
                  <Users className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-3">Show Up & Connect</CardTitle>
                <CardDescription className="text-base leading-relaxed px-4">
                  Meet new people in a relaxed, meaningful setting.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Mobile: Swipeable Carousel */}
          <div className="md:hidden relative">
            <div className="overflow-hidden" ref={emblaRefHowItWorks}>
              <div className="flex gap-4">
                <div className="flex-[0_0_85%] min-w-0">
                  <Card className="text-center shadow-[var(--shadow-card)] rounded-3xl border-2 border-border/50 h-full">
                    <CardHeader className="pb-4 pt-8">
                      <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="h-10 w-10 text-primary" />
                      </div>
                      <CardTitle className="text-2xl mb-3">Take the Assessment</CardTitle>
                      <CardDescription className="text-base leading-relaxed px-4">
                        Tell us a little about yourself so we can match you well.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>

                <div className="flex-[0_0_85%] min-w-0">
                  <Card className="text-center shadow-[var(--shadow-card)] rounded-3xl border-2 border-border/50 h-full">
                    <CardHeader className="pb-4 pt-8">
                      <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6">
                        <Calendar className="h-10 w-10 text-primary" />
                      </div>
                      <CardTitle className="text-2xl mb-3">Book a Dinner or Lunch</CardTitle>
                      <CardDescription className="text-base leading-relaxed px-4">
                        Choose from curated events happening every week.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>

                <div className="flex-[0_0_85%] min-w-0">
                  <Card className="text-center shadow-[var(--shadow-card)] rounded-3xl border-2 border-border/50 h-full">
                    <CardHeader className="pb-4 pt-8">
                      <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6">
                        <Users className="h-10 w-10 text-primary" />
                      </div>
                      <CardTitle className="text-2xl mb-3">Show Up & Connect</CardTitle>
                      <CardDescription className="text-base leading-relaxed px-4">
                        Meet new people in a relaxed, meaningful setting.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            </div>

            {/* Navigation Arrows */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm shadow-lg disabled:opacity-30 z-10"
              onClick={() => emblaApiHowItWorks?.scrollPrev()}
              disabled={!canScrollPrevHowItWorks}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm shadow-lg disabled:opacity-30 z-10"
              onClick={() => emblaApiHowItWorks?.scrollNext()}
              disabled={!canScrollNextHowItWorks}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* CTA after How It Works */}
          <div className="text-center mt-16">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-base md:text-lg px-6 py-3 md:px-10 md:py-6 h-auto rounded-full shadow-elevated group"
            >
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Upcoming Events Preview */}
      {upcomingEvents.length > 0 && (
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-primary">Upcoming Events</h2>
              <p className="text-xl text-muted-foreground">Join us for one of these experiences</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {upcomingEvents.map((event) => (
                <Card
                  key={event.id}
                  className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all cursor-pointer group rounded-2xl border-2 border-border/50"
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <CardHeader className="pb-4">
                    <div className="text-4xl mb-3">{getEventEmoji(event.eventType)}</div>
                    <Badge className="w-fit mb-2 rounded-full">{event.eventType}</Badge>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors leading-tight">
                      {event.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(new Date(event.startTime), "MMM d, h:mm a")}
                    </div>
                    <div className="flex items-center text-sm font-semibold text-primary">
                      ${event.price}
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-3 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/events/${event.id}`);
                      }}
                    >
                      View Event
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/events")}
                className="rounded-full border-2 border-primary hover:bg-primary/5"
              >
                View All Events
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-primary">What People Are Saying</h2>
          </div>

          {/* Desktop: Grid */}
          <div className="hidden md:grid md:grid-cols-3 gap-8">
            <Card className="shadow-[var(--shadow-card)] rounded-2xl border-2 border-border/50">
              <CardContent className="pt-8 pb-6 px-6">
                <MessageCircle className="h-8 w-8 text-secondary mb-4" />
                <p className="text-lg leading-relaxed mb-4 italic">
                  "I met two of my closest friends through Enqoy. Such a wholesome experience."
                </p>
                <p className="font-semibold text-primary">— Hana</p>
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-card)] rounded-2xl border-2 border-border/50">
              <CardContent className="pt-8 pb-6 px-6">
                <MessageCircle className="h-8 w-8 text-secondary mb-4" />
                <p className="text-lg leading-relaxed mb-4 italic">
                  "I was nervous at first, but the dinner felt so natural. Highly recommended."
                </p>
                <p className="font-semibold text-primary">— Nati</p>
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-card)] rounded-2xl border-2 border-border/50">
              <CardContent className="pt-8 pb-6 px-6">
                <MessageCircle className="h-8 w-8 text-secondary mb-4" />
                <p className="text-lg leading-relaxed mb-4 italic">
                  "I've never connected with strangers this easily. The vibe is unmatched."
                </p>
                <p className="font-semibold text-primary">— Ruth</p>
              </CardContent>
            </Card>
          </div>

          {/* Mobile: Swipeable Carousel */}
          <div className="md:hidden relative">
            <div className="overflow-hidden" ref={emblaRefTestimonials}>
              <div className="flex gap-4">
                <div className="flex-[0_0_85%] min-w-0">
                  <Card className="shadow-[var(--shadow-card)] rounded-2xl border-2 border-border/50 h-full">
                    <CardContent className="pt-8 pb-6 px-6">
                      <MessageCircle className="h-8 w-8 text-secondary mb-4" />
                      <p className="text-lg leading-relaxed mb-4 italic">
                        "I met two of my closest friends through Enqoy. Such a wholesome experience."
                      </p>
                      <p className="font-semibold text-primary">— Hana</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex-[0_0_85%] min-w-0">
                  <Card className="shadow-[var(--shadow-card)] rounded-2xl border-2 border-border/50 h-full">
                    <CardContent className="pt-8 pb-6 px-6">
                      <MessageCircle className="h-8 w-8 text-secondary mb-4" />
                      <p className="text-lg leading-relaxed mb-4 italic">
                        "I was nervous at first, but the dinner felt so natural. Highly recommended."
                      </p>
                      <p className="font-semibold text-primary">— Nati</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex-[0_0_85%] min-w-0">
                  <Card className="shadow-[var(--shadow-card)] rounded-2xl border-2 border-border/50 h-full">
                    <CardContent className="pt-8 pb-6 px-6">
                      <MessageCircle className="h-8 w-8 text-secondary mb-4" />
                      <p className="text-lg leading-relaxed mb-4 italic">
                        "I've never connected with strangers this easily. The vibe is unmatched."
                      </p>
                      <p className="font-semibold text-primary">— Ruth</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Navigation Arrows */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm shadow-lg disabled:opacity-30 z-10"
              onClick={() => emblaApiTestimonials?.scrollPrev()}
              disabled={!canScrollPrevTestimonials}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm shadow-lg disabled:opacity-30 z-10"
              onClick={() => emblaApiTestimonials?.scrollNext()}
              disabled={!canScrollNextTestimonials}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Emotional Section */}
      <section className="relative py-32 px-4 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroDining})` }}
        />
        <div className="absolute inset-0 bg-primary/70" />

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <div className="inline-flex items-center justify-center mb-6">
            <Heart className="h-12 w-12 text-secondary drop-shadow-md" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-relaxed px-4 drop-shadow-lg">
            New friends, new stories, new memories. Enqoy makes meeting people easier and more meaningful.
          </h2>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="mt-8 text-base md:text-lg px-6 py-3 md:px-12 md:py-6 h-auto rounded-full shadow-elevated bg-secondary hover:bg-secondary/90 text-secondary-foreground group"
          >
            Start Your Journey
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-primary">Frequently Asked Questions</h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-card rounded-2xl px-6 border-2 border-border/50 shadow-[var(--shadow-card)]">
              <AccordionTrigger className="text-lg font-semibold hover:text-primary text-left">
                How does Enqoy work?
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                You sign up, take the assessment, book an event, and show up for a curated small group experience.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-card rounded-2xl px-6 border-2 border-border/50 shadow-[var(--shadow-card)]">
              <AccordionTrigger className="text-lg font-semibold hover:text-primary text-left">
                Do I need to take the assessment before booking?
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                Yes. It helps us match you with people you'll genuinely enjoy meeting.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-card rounded-2xl px-6 border-2 border-border/50 shadow-[var(--shadow-card)]">
              <AccordionTrigger className="text-lg font-semibold hover:text-primary text-left">
                What happens after I book an event?
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                You'll get an immediate confirmation. The location is revealed 48 hours before the event, and the attendee snapshot 24 hours before.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-card rounded-2xl px-6 border-2 border-border/50 shadow-[var(--shadow-card)]">
              <AccordionTrigger className="text-lg font-semibold hover:text-primary text-left">
                What if I can't make it?
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                You can reschedule if you cancel at least 48 hours before the event.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-card rounded-2xl px-6 border-2 border-border/50 shadow-[var(--shadow-card)]">
              <AccordionTrigger className="text-lg font-semibold hover:text-primary text-left">
                Do I need photos or a profile?
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                No photos needed for now. Just your assessment and basic details.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="bg-card rounded-2xl px-6 border-2 border-border/50 shadow-[var(--shadow-card)]">
              <AccordionTrigger className="text-lg font-semibold hover:text-primary text-left">
                Is this a dating app?
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                No. Enqoy is for building friendships and meaningful conversations.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Final CTA */}
          <div className="text-center mt-16">
            <div className="mb-6">
              <h3 className="text-2xl md:text-3xl font-bold mb-3 text-primary">Ready to Connect?</h3>
              <p className="text-lg text-muted-foreground">Take the first step toward meaningful connections today.</p>
            </div>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-base md:text-lg px-6 py-3 md:px-12 md:py-6 h-auto rounded-full shadow-elevated group"
            >
              Take the Assessment
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
            <div className="text-2xl font-bold">Enqoy</div>
            <nav className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="#" className="hover:text-accent transition-colors">About</a>
              <a href="#" className="hover:text-accent transition-colors">Contact</a>
              <a href="#" className="hover:text-accent transition-colors">Terms</a>
              <a href="#" className="hover:text-accent transition-colors">Privacy</a>
            </nav>
          </div>
          <div className="text-center text-sm opacity-80">
            Made with ❤️ in Addis Ababa
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
