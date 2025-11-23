import { useState, useEffect } from "react";
import { X, Shuffle, ChevronLeft, ChevronRight, Heart, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface IceBreakerGameProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

interface Question {
  id: string;
  question_text: string;
}

export const IceBreakerGame = ({ isOpen, onClose, eventId }: IceBreakerGameProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const minSwipeDistance = 50;

  useEffect(() => {
    if (isOpen) {
      fetchQuestions();
      setShowSwipeHint(true);
      // Hide hint after 3 seconds
      const timer = setTimeout(() => setShowSwipeHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("icebreaker_questions")
        .select("id, question_text")
        .eq("is_active", true);

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
    setCurrentIndex(0);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setSwipeDirection('left');
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setSwipeDirection(null);
      }, 200);
      setShowSwipeHint(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setSwipeDirection('right');
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1);
        setSwipeDirection(null);
      }, 200);
      setShowSwipeHint(false);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }
    
    setTouchStart(null);
    setTouchEnd(null);
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
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden relative">
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
          <>
            {/* Swipe Hint */}
            {showSwipeHint && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 animate-fade-in">
                <div className="bg-primary/90 text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
                  <ChevronLeft className="h-4 w-4 animate-pulse" />
                  <span className="text-sm font-medium">Swipe to navigate</span>
                  <ChevronRight className="h-4 w-4 animate-pulse" />
                </div>
              </div>
            )}

            {/* Left Navigation Hint */}
            {currentIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-card/80 backdrop-blur-sm shadow-lg hover:bg-card transition-all hover:scale-110"
              >
                <ChevronLeft className="h-6 w-6 text-primary" />
              </button>
            )}

            {/* Right Navigation Hint */}
            {currentIndex < questions.length - 1 && (
              <button
                onClick={handleNext}
                className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-card/80 backdrop-blur-sm shadow-lg hover:bg-card transition-all hover:scale-110"
              >
                <ChevronRight className="h-6 w-6 text-primary" />
              </button>
            )}

            <div
              className="w-full max-w-2xl relative"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <div 
                className={`bg-gradient-to-br from-card to-card/90 rounded-3xl p-8 shadow-elevated min-h-[400px] flex flex-col items-center justify-center border-2 border-border/50 transition-transform duration-200 ${
                  swipeDirection === 'left' ? 'translate-x-[-20px] opacity-80' : 
                  swipeDirection === 'right' ? 'translate-x-[20px] opacity-80' : ''
                }`}
              >
                <p className="text-2xl md:text-3xl leading-relaxed text-center text-card-foreground font-medium">
                  {questions[currentIndex]?.question_text}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-6 mt-8">
                  {currentIndex > 0 && (
                    <button
                      onClick={handlePrevious}
                      className="group p-4 rounded-full bg-muted hover:bg-muted/80 transition-all hover:scale-110 shadow-md"
                      aria-label="Previous question"
                    >
                      <ChevronLeft className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  )}
                  
                  <button
                    onClick={handleShuffle}
                    className="group p-5 rounded-full bg-accent/10 hover:bg-accent/20 transition-all hover:scale-110 shadow-md"
                    aria-label="Shuffle questions"
                  >
                    <Shuffle className="h-7 w-7 text-accent group-hover:rotate-180 transition-transform duration-500" />
                  </button>

                  {currentIndex < questions.length - 1 && (
                    <button
                      onClick={handleNext}
                      className="group p-4 rounded-full bg-primary hover:bg-primary/90 transition-all hover:scale-110 shadow-md"
                      aria-label="Next question"
                    >
                      <ChevronRight className="h-6 w-6 text-primary-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* Stack effect - cards behind */}
              {currentIndex < questions.length - 1 && (
                <div className="absolute inset-0 bg-card/40 rounded-3xl -z-10 translate-y-2 scale-[0.98] blur-[1px]" />
              )}
              {currentIndex < questions.length - 2 && (
                <div className="absolute inset-0 bg-card/20 rounded-3xl -z-20 translate-y-4 scale-[0.96] blur-[2px]" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Progress Dots */}
      {questions.length > 0 && (
        <div className="pb-8 pt-4 px-4">
          <div className="flex justify-center gap-2 mb-4">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <div className="text-center text-sm text-muted-foreground">
            {currentIndex + 1} of {questions.length}
          </div>
        </div>
      )}
    </div>
  );
};
