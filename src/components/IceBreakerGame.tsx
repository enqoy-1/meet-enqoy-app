import { useState, useEffect } from "react";
import { X, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { icebreakersApi } from "@/api";

interface IceBreakerGameProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

interface Question {
  id: string;
  questionText: string;
}

export const IceBreakerGame = ({ isOpen, onClose, eventId }: IceBreakerGameProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchQuestions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const data = await icebreakersApi.getActive();

      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error);
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    api?.scrollTo(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10"
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-semibold text-foreground">Ice Breakers</h1>
          <p className="text-sm text-muted-foreground">
            Swipe through questions and take turns answering
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleShuffle}
          className="h-10 w-10"
          disabled={questions.length === 0}
        >
          <Shuffle className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
        {isLoading ? (
          <div className="text-center">
            <div className="animate-pulse text-muted-foreground">Loading questions...</div>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center max-w-md mx-auto px-4">
            <p className="text-lg text-foreground mb-2">No questions available yet</p>
            <p className="text-muted-foreground">Please check back soon.</p>
          </div>
        ) : (
          <Carousel
            setApi={setApi}
            opts={{
              align: "center",
              loop: false,
            }}
            className="w-full max-w-5xl"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {questions.map((question, index) => (
                <CarouselItem key={question.id} className="pl-2 md:pl-4 basis-[85%] md:basis-[70%]">
                  <div 
                    className={`transition-all duration-500 ease-out ${
                      index === current 
                        ? 'scale-100 opacity-100' 
                        : 'scale-[0.85] opacity-40 blur-[2px]'
                    }`}
                    style={{
                      transform: index === current 
                        ? 'translateZ(0) scale(1)' 
                        : 'translateZ(-50px) scale(0.85)'
                    }}
                  >
                    <Card 
                      className={`relative overflow-hidden border-0 rounded-2xl transition-all duration-500 ${
                        index === current 
                          ? 'shadow-premium-active' 
                          : 'shadow-premium'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-card" />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                      <CardContent className="relative flex items-center justify-center min-h-[420px] md:min-h-[480px] p-10 md:p-16">
                        <p className="text-2xl md:text-3xl lg:text-4xl leading-relaxed text-center font-medium text-icebreaker-text drop-shadow-sm">
                          {question.questionText}
                        </p>
                      </CardContent>
                      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 md:-left-14 h-14 w-14 border-0 bg-background/90 backdrop-blur-sm shadow-premium hover:scale-110 hover:shadow-premium-active transition-all duration-300" />
            <CarouselNext className="right-2 md:-right-14 h-14 w-14 border-0 bg-background/90 backdrop-blur-sm shadow-premium hover:scale-110 hover:shadow-premium-active transition-all duration-300" />
          </Carousel>
        )}
      </div>

      {/* Progress Dots */}
      {questions.length > 0 && (
        <div className="pb-8 pt-4 px-4">
          <div className="flex justify-center gap-2 mb-4">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`h-2 rounded-full transition-all ${
                  index === current
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <div className="text-center text-sm text-muted-foreground">
            {current + 1} of {questions.length}
          </div>
        </div>
      )}
    </div>
  );
};
