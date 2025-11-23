import { useState, useEffect } from "react";
import { X, Shuffle } from "lucide-react";
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

  const minSwipeDistance = 50;

  useEffect(() => {
    if (isOpen) {
      fetchQuestions();
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
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
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
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
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
          <div
            className="w-full max-w-2xl"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="bg-card rounded-3xl p-8 shadow-elevated min-h-[300px] flex items-center justify-center">
              <p className="text-2xl md:text-3xl leading-relaxed text-center text-card-foreground">
                {questions[currentIndex]?.question_text}
              </p>
            </div>
          </div>
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
