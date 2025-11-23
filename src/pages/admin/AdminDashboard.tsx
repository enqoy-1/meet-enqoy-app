import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Calendar, MessageSquare, MapPin, HelpCircle, BarChart } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const adminSections = [
    {
      title: "Users",
      description: "Manage user profiles and assessments",
      icon: Users,
      path: "/admin/users",
    },
    {
      title: "Events",
      description: "Create and manage events",
      icon: Calendar,
      path: "/admin/events",
    },
    {
      title: "Venues",
      description: "Manage venue locations",
      icon: MapPin,
      path: "/admin/venues",
    },
    {
      title: "Event Pairings",
      description: "Manage guest pairings and restaurant assignments",
      icon: Users,
      path: "/admin/pairings",
    },
    {
      title: "Icebreakers",
      description: "Manage icebreaker questions",
      icon: HelpCircle,
      path: "/admin/icebreakers",
    },
    {
      title: "Announcements",
      description: "Create and manage announcements",
      icon: MessageSquare,
      path: "/admin/announcements",
    },
    {
      title: "Analytics",
      description: "View stats and export data",
      icon: BarChart,
      path: "/admin/analytics",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome, Admin</h2>
          <p className="text-muted-foreground">
            Manage all aspects of the Enqoy platform
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.path}
                className="shadow-card hover:shadow-elevated transition-all cursor-pointer group"
                onClick={() => navigate(section.path)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {section.title}
                      </CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
