import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft } from "lucide-react";

export default function FAQ() {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "How do I book an event?",
      answer: "Navigate to the Events page from your dashboard, browse available events, and click 'Book Now' on any event you'd like to attend. You'll need to complete the assessment first if you haven't already."
    },
    {
      question: "What is the personality assessment?",
      answer: "The personality assessment helps us understand your preferences and interests better, allowing us to create more meaningful pairings at events. It only takes a few minutes to complete and helps ensure you have the best possible experience."
    },
    {
      question: "How are pairings decided?",
      answer: "We use a combination of your assessment responses, preferences, and event type to create balanced and interesting pairings. Our goal is to help you meet new people with compatible interests and conversation styles."
    },
    {
      question: "Can I cancel my booking?",
      answer: "Yes, cancellations are typically allowed up to 24 hours before the event for a full or partial refund, depending on the event's specific policy. Check the event details or your booking confirmation for the exact cancellation terms."
    },
    {
      question: "What should I expect at an event?",
      answer: "Events vary by type (dinner, lunch, mixer, etc.), but generally you'll be seated with a small group of people with similar interests. Icebreaker questions help start conversations, and the atmosphere is always welcoming and respectful."
    },
    {
      question: "How do I pay for events?",
      answer: "Payment is processed securely through our platform when you confirm your booking. We accept various payment methods, and you'll receive a confirmation email with your payment receipt."
    },
    {
      question: "Can I attend events with friends?",
      answer: "While our events are designed for meeting new people, you can note your friend connections in your profile. We'll try to accommodate groups when possible, though the focus is on expanding your social circle."
    },
    {
      question: "What if I have dietary restrictions?",
      answer: "You can specify dietary preferences and restrictions in your assessment. We work with venues to accommodate various dietary needs whenever possible. Always inform us of any allergies or serious restrictions."
    },
    {
      question: "How often are new events added?",
      answer: "We regularly add new events throughout the month. Check the Events page frequently, or enable notifications to be alerted when new events matching your interests are available."
    },
    {
      question: "Can I provide feedback after an event?",
      answer: "Yes! We highly encourage feedback. After attending an event, you'll see an option to provide feedback in your dashboard under Past Events. Your input helps us improve future experiences."
    },
    {
      question: "What if I'm running late to an event?",
      answer: "Please contact us immediately if you're running late. We'll do our best to accommodate you, but please note that venues have schedules to maintain. Arriving on time ensures the best experience for everyone."
    },
    {
      question: "How do I update my profile information?",
      answer: "You can update most profile information through your account settings. If you need to retake the assessment to update your preferences, contact our support team."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="bg-card border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Frequently Asked Questions</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>How can we help you?</CardTitle>
            <p className="text-sm text-muted-foreground">
              Find answers to common questions about Enqoy events and services
            </p>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-8 p-6 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Still have questions?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you couldn't find the answer you're looking for, feel free to reach out to our support team.
              </p>
              <Button variant="outline">Contact Support</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
