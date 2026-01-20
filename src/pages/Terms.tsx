import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="bg-card border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Terms and Conditions</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Enqoy Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using Enqoy's services, you agree to be bound by these Terms and Conditions. 
                If you do not agree to these terms, please do not use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Event Bookings</h2>
              <p className="text-muted-foreground mb-2">
                All event bookings are subject to availability and confirmation. When you book an event:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>You must provide accurate and complete information</li>
                <li>Payment must be completed to confirm your booking</li>
                <li>You will receive a confirmation email with event details</li>
                <li>Cancellation policies apply as stated during booking</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Conduct</h2>
              <p className="text-muted-foreground mb-2">
                Users are expected to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Respect other attendees and event hosts</li>
                <li>Arrive on time for events</li>
                <li>Follow venue rules and guidelines</li>
                <li>Provide honest feedback when requested</li>
                <li>Not engage in harassment or discriminatory behavior</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Payment and Refunds</h2>
              <p className="text-muted-foreground">
                All payments are processed securely. Refund policies vary by event and will be clearly
                stated at the time of booking. Generally, cancellations made 24 hours before an event
                may be eligible for a partial or full refund.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Privacy and Data Protection</h2>
              <p className="text-muted-foreground">
                We take your privacy seriously. Your personal information is collected and processed in 
                accordance with applicable data protection laws. We use your data to provide our services, 
                improve user experience, and communicate event information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Liability</h2>
              <p className="text-muted-foreground">
                Enqoy acts as a platform connecting users with events. While we strive to ensure quality 
                experiences, we are not liable for issues arising from venue operations, other attendees' 
                behavior, or circumstances beyond our control.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Users will be notified of 
                significant changes, and continued use of the platform constitutes acceptance of 
                updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Contact Information</h2>
              <p className="text-muted-foreground">
                For questions about these terms, please contact us through our support channels 
                available in your account dashboard.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
