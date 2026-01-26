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

  const countryName = user?.profile?.country?.name || "your country";
  const countryCode = user?.profile?.country?.code || "XX";
  const hasCompletedAssessment = user?.profile?.assessmentCompleted;

  const handleTakeAssessment = () => {
    if (hasCompletedAssessment) {
      // User already completed assessment, go to profile
      navigate("/profile");
    } else {
      // User needs to complete assessment
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
        {/* Header */}
        <header className="flex justify-between items-start px-8 md:px-16 lg:px-24 pt-8 md:pt-12">
          {/* Logo + Country Code Badge */}
          <div className="flex items-center gap-2">
            <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold tracking-wider" style={{ fontFamily: "'Playfair Display', serif" }}>
              ENQOY
            </h1>
            <div className="bg-primary text-white text-xs md:text-sm font-bold px-2 py-1 rounded">
              {countryCode.substring(0, 2).toUpperCase()}
            </div>
          </div>

          {/* Profile */}
          <div className="flex items-start">
            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                  <Avatar className="h-10 w-10 md:h-12 md:w-12 border-2 border-white/30 hover:border-white/60 transition-colors cursor-pointer">
                    <AvatarFallback className="bg-primary text-white font-semibold">
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
        <main className="flex-1 flex flex-col justify-center px-6 sm:px-8 md:px-16 lg:px-24 pb-16 sm:pb-24">
          <div className="max-w-4xl">
            {/* Main Heading */}
            <h2
              className="text-white text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.1] mb-8"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              <span className="sm:whitespace-nowrap">The Enqoy Experience</span>
              <br />
              <span className="sm:whitespace-nowrap">
                Is Coming To{" "}
                <span className="inline-block bg-primary text-white px-3 py-1 rounded">
                  {countryName}
                </span>
              </span>
            </h2>

            {/* Subtitle */}
            <p className="text-white/90 text-base sm:text-xl md:text-2xl mb-8 sm:mb-12 max-w-2xl leading-relaxed">
              Get ready for curated dining experiences and meaningful connections.
              Enqoy is expanding, and {countryName} is next!
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={handleTakeAssessment}
                className="bg-primary border-2 border-primary text-white hover:bg-primary/90 rounded-full px-8 sm:px-12 py-5 sm:py-7 text-lg sm:text-xl font-medium transition-all"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {hasCompletedAssessment ? "View Profile" : "Take Assessment"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled
                className="bg-transparent border-2 border-white text-white rounded-full px-8 sm:px-12 py-5 sm:py-7 text-lg sm:text-xl font-medium cursor-default disabled:opacity-100 hover:bg-transparent hover:text-white"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Stay Tuned
              </Button>
            </div>
          </div>
        </main>

        {/* Decorative stars - top right (hidden on mobile) */}
        <div className="hidden sm:block absolute top-32 md:top-40 right-8 lg:right-16 xl:right-24">
          <img src="/Asset 1.svg" alt="" className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 xl:w-56 xl:h-56" />
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
