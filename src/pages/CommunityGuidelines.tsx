import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Heart, Users, Shield, MessageCircle } from "lucide-react";

export default function CommunityGuidelines() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="bg-card border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Community Guidelines</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to the Enqoy Community</CardTitle>
            <p className="text-muted-foreground">
              Our community guidelines help create a safe, welcoming, and enjoyable experience for everyone
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Be Respectful</h3>
                <p className="text-sm text-muted-foreground">
                  Treat everyone with kindness and respect. We celebrate diversity and welcome people 
                  from all backgrounds, cultures, and walks of life. Discrimination, harassment, or 
                  hate speech of any kind is not tolerated.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Foster Genuine Connections</h3>
                <p className="text-sm text-muted-foreground">
                  Enqoy is about building authentic relationships. Come with an open mind and a 
                  willingness to engage in meaningful conversation. Listen actively and share 
                  thoughtfully to create memorable experiences for everyone.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Maintain Personal Safety</h3>
                <p className="text-sm text-muted-foreground">
                  Your safety is our priority. Events take place in public venues. If you ever feel 
                  uncomfortable, please inform our staff or venue personnel immediately. Share personal 
                  contact information only when you feel comfortable doing so.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Communicate Openly</h3>
                <p className="text-sm text-muted-foreground">
                  Clear communication enhances everyone's experience. If you need to cancel, do so 
                  promptly. Provide honest feedback to help us improve. Reach out if you have questions 
                  or concerns—we're here to help.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Behavior Standards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2 text-green-600">✓ Do:</h3>
              <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                <li>Arrive on time and prepared for meaningful conversation</li>
                <li>Be present and engaged during events</li>
                <li>Respect personal boundaries and consent</li>
                <li>Follow venue rules and staff instructions</li>
                <li>Provide constructive feedback when asked</li>
                <li>Report any concerning behavior to staff</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2 text-red-600">✗ Don't:</h3>
              <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                <li>Engage in harassment, bullying, or aggressive behavior</li>
                <li>Use offensive language or make discriminatory remarks</li>
                <li>Pressure others for personal information or contact details</li>
                <li>Attend events under the influence of alcohol or drugs</li>
                <li>Disrupt events or make others feel uncomfortable</li>
                <li>Use events for commercial solicitation without permission</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consequences</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              Violations of these guidelines may result in:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Warning from event staff</li>
              <li>Removal from current event without refund</li>
              <li>Suspension from future events</li>
              <li>Permanent ban from the Enqoy platform</li>
              <li>Legal action in severe cases</li>
            </ul>
            <p className="pt-3">
              We reserve the right to take appropriate action based on the severity and context of 
              each situation to maintain a safe and welcoming community for all members.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reporting Issues</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-4">
              If you experience or witness behavior that violates these guidelines, please report it 
              immediately. You can:
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>Speak directly to event staff or venue personnel</li>
              <li>Contact our support team through your dashboard</li>
              <li>Email us with details of the incident</li>
            </ul>
            <p>
              All reports are taken seriously and handled confidentially. We're committed to creating 
              a safe, inclusive community for everyone.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
