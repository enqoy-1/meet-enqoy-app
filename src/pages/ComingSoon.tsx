import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
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

const ComingSoon = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleSignOut = () => {
    logout();
    navigate("/");
  };

  const hasCompletedAssessment = user?.profile?.assessmentCompleted;

  const handleTakeAssessment = () => {
    if (hasCompletedAssessment) {
      navigate("/profile");
    } else {
      navigate("/assessment");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Full screen background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('/Untitled Catalog1726 (1).jpg')` }}
      />

      {/* Subtle overlay for text readability */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Content */}
      <div className="relative min-h-screen flex flex-col">
        {/* Header - hidden on mobile */}
        <header className="hidden sm:flex justify-between items-start px-8 md:px-16 lg:px-24 pt-8 md:pt-10">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold tracking-wider" style={{ fontFamily: "'Playfair Display', serif" }}>
              ENQOY
            </h1>
          </div>

          {/* Profile */}
          <div className="flex items-start">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                  <Avatar className="h-10 w-10 border-2 border-white/30 hover:border-white/60 transition-colors cursor-pointer">
                    <AvatarFallback className="bg-primary text-white font-semibold text-sm">
                      {user?.profile?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
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

        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-center items-center sm:items-start px-8 sm:px-8 md:px-16 lg:px-24 pb-24 sm:pb-16 -mt-16 sm:mt-0">
          <div className="max-w-4xl w-full text-center sm:text-left">
            {/* Mobile Logo - only visible on mobile */}
            <h1
              className="sm:hidden text-white text-2xl font-bold tracking-[0.25em] mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              ENQOY
            </h1>

            {/* Main Heading */}
            <h2
              className="text-white text-[2.75rem] sm:text-7xl md:text-8xl lg:text-9xl font-bold mb-4 sm:mb-8"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              <span className="whitespace-nowrap block">Enqoy Is Coming</span>
              <span className="whitespace-nowrap block mt-2 sm:mt-4">
                to{" "}
                <span
                  className="inline-block text-white px-2 md:px-3"
                  style={{
                    background: 'linear-gradient(to right, transparent 0%, rgba(2, 64, 64, 0.3) 15%, rgba(2, 64, 64, 0.7) 40%, #024040 70%, #024040 100%)',
                    borderRadius: '4px'
                  }}
                >
                  Kigali
                </span>
              </span>
            </h2>

            {/* Subtitle */}
            <p
              className="text-white text-xl sm:text-2xl md:text-3xl mb-8 sm:mb-12 max-w-md sm:max-w-2xl mx-auto sm:mx-0 leading-relaxed italic font-medium"
              style={{
                textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.6), 0 0 40px rgba(0,0,0,0.4)'
              }}
            >
              Curated dining experiences designed to help you meet new people and form real connections. Take the assessment now and be the first to know when Enqoy hosts its very first event in Kigali.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-4 w-full sm:w-auto items-center sm:items-start">
              <Button
                size="lg"
                onClick={handleTakeAssessment}
                className="bg-primary border-2 border-primary text-white hover:bg-primary/90 rounded-full px-10 sm:px-12 py-6 sm:py-7 text-xl sm:text-xl font-medium transition-all w-full max-w-sm sm:max-w-none sm:w-auto"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {hasCompletedAssessment ? "View Profile" : "Take the Assessment"}
              </Button>

              {/* Desktop: Outline button */}
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/")}
                className="hidden sm:flex bg-transparent border-2 border-white text-white rounded-full px-12 py-7 text-xl font-medium hover:bg-white/10 hover:text-white transition-all"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Learn More
              </Button>

              {/* Mobile: Underlined text link */}
              <button
                onClick={() => navigate("/")}
                className="sm:hidden text-white text-lg font-medium underline underline-offset-4 mt-1"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Learn More
              </button>
            </div>
          </div>
        </main>

        {/* Decorative stars - desktop: top right */}
        <div className="hidden sm:block absolute top-28 md:top-32 right-8 lg:right-16 xl:right-24">
          <img src="/Asset 1.svg" alt="" className="w-32 h-32 md:w-44 md:h-44 lg:w-56 lg:h-56" />
        </div>

        {/* Mobile stars - bottom right */}
        <div className="sm:hidden absolute bottom-6 right-6">
          <img src="/Asset 1.svg" alt="" className="w-16 h-16 brightness-0 invert opacity-70" />
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
