import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, LogOut, User, ChevronDown, CheckCircle2, Clock, Sparkles, Users, Heart, Calendar, Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import heroDining from "@/assets/hero-dining.jpg";

const ComingSoon = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleSignOut = () => {
    logout();
    navigate("/");
  };

  const countryName = user?.profile?.country?.name || "your country";
  const mainCity = user?.profile?.country?.mainCity || "your city";
  const assessmentCompleted = user?.profile?.assessmentCompleted;

  const features = [
    {
      icon: Users,
      title: "Curated Connections",
      description: "Meet interesting people matched by our personality algorithm"
    },
    {
      icon: Heart,
      title: "Meaningful Experiences",
      description: "Enjoy carefully selected venues and thoughtful conversations"
    },
    {
      icon: Calendar,
      title: "Regular Events",
      description: "Weekly dinners and social gatherings in your city"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">
            Enqoy
          </h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 h-auto py-2 px-3 hover:bg-white/10 text-white">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-white font-semibold">
                    {user?.profile?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    {user?.profile?.lastName?.[0]?.toUpperCase() || ""}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium text-white">
                    {user?.profile?.firstName && user?.profile?.lastName
                      ? `${user.profile.firstName} ${user.profile.lastName}`
                      : user?.profile?.firstName || user?.email?.split("@")[0] || "User"}
                  </span>
                  <span className="text-xs text-white/70">{user?.email}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-white/70 hidden md:block" />
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
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroDining})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
        </div>

        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center text-white">
            <Badge className="mb-6 bg-primary/90 hover:bg-primary text-white border-0 px-4 py-1.5">
              <MapPin className="h-3.5 w-3.5 mr-1.5" />
              {countryName}
            </Badge>

            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Something Special is
              <span className="block bg-gradient-to-r from-orange-400 to-primary bg-clip-text text-transparent">
                Coming to {countryName}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-lg mx-auto">
              Get ready for curated dining experiences and meaningful connections.
              Enqoy is expanding, and {countryName} is next!
            </p>

            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Bell className="h-4 w-4 text-orange-400" />
                <span className="text-sm">You'll be notified at launch</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 flex-1">
        <div className="max-w-4xl mx-auto space-y-12">

          {/* Status Card */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-orange-500/5 overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <div className={`h-20 w-20 rounded-full flex items-center justify-center ${
                    assessmentCompleted
                      ? 'bg-gradient-to-br from-green-400 to-green-600'
                      : 'bg-gradient-to-br from-amber-400 to-orange-500'
                  }`}>
                    {assessmentCompleted ? (
                      <CheckCircle2 className="h-10 w-10 text-white" />
                    ) : (
                      <Sparkles className="h-10 w-10 text-white" />
                    )}
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-xl font-bold mb-1">
                    {assessmentCompleted ? "You're All Set!" : "One Step Away"}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {assessmentCompleted
                      ? "Your personality profile is complete. You'll be among the first to experience Enqoy events when we launch!"
                      : "Complete your personality profile now so we can match you with the perfect dining companions when we launch."
                    }
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                    {!assessmentCompleted && (
                      <Button
                        onClick={() => navigate("/assessment")}
                        className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Complete Profile
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => navigate("/profile")}
                    >
                      <User className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What to Expect */}
          <div>
            <h2 className="text-2xl font-bold text-center mb-8">
              What to Expect
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/10 to-orange-500/10 flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center bg-muted/50 rounded-2xl p-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-muted-foreground">Launching Soon</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Stay Tuned, {user?.profile?.firstName || "Friend"}!
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              We're working hard to bring unforgettable experiences to {countryName}.
              You'll be the first to know when we're ready!
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-background to-muted/50 border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Enqoy. Bringing people together, one dinner at a time.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ComingSoon;
