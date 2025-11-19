import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Sparkles, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-dining.jpg";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="People enjoying dining experience in Addis Ababa" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent leading-tight">
              Enqoy
            </h1>
            <p className="text-2xl md:text-3xl lg:text-4xl text-foreground/90 mb-4 font-medium">
              Meet amazing people over great food
            </p>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl">
              Join curated small group dining experiences in Addis Ababa. Connect with like-minded people who share your interests while enjoying delicious meals at the city's best restaurants.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")} 
                className="text-lg px-10 py-6 h-auto group"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate("/auth")} 
                className="text-lg px-10 py-6 h-auto border-2"
              >
                Browse Events
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to meaningful connections
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="shadow-lg hover:shadow-xl transition-shadow border-2">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Take the Assessment</CardTitle>
                <CardDescription className="text-base mt-3">
                  Tell us about yourself so we can match you with the perfect group of people
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="shadow-lg hover:shadow-xl transition-shadow border-2">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Get Matched</CardTitle>
                <CardDescription className="text-base mt-3">
                  We'll curate small group lunches and dinners based on your interests and profile
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="shadow-lg hover:shadow-xl transition-shadow border-2">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Meet New People</CardTitle>
                <CardDescription className="text-base mt-3">
                  Show up and enjoy meaningful connections over delicious food at great venues
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
