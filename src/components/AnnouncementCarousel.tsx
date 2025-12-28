import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { announcementsApi } from "@/api";

interface Announcement {
    id: string;
    title: string;
    message: string;
    imageUrl?: string;
    priority: number;
}

interface AnnouncementCarouselProps {
    autoSlideInterval?: number; // in milliseconds
    onDismiss?: () => void;
}

export const AnnouncementCarousel = ({
    autoSlideInterval = 5000,
    onDismiss,
}: AnnouncementCarouselProps) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const data = await announcementsApi.getActive();
            setAnnouncements(data || []);
        } catch (error) {
            console.error("Failed to load announcements:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) =>
            prev === announcements.length - 1 ? 0 : prev + 1
        );
    }, [announcements.length]);

    const prevSlide = () => {
        setCurrentIndex((prev) =>
            prev === 0 ? announcements.length - 1 : prev - 1
        );
    };

    // Auto-slide effect
    useEffect(() => {
        if (announcements.length <= 1 || isPaused) return;

        const interval = setInterval(nextSlide, autoSlideInterval);
        return () => clearInterval(interval);
    }, [announcements.length, autoSlideInterval, isPaused, nextSlide]);

    if (isLoading || announcements.length === 0) {
        return null;
    }

    const current = announcements[currentIndex];

    return (
        <Card
            className="relative overflow-hidden bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Close button */}
            {onDismiss && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10 h-6 w-6"
                    onClick={onDismiss}
                >
                    <X className="h-4 w-4" />
                </Button>
            )}

            <div className="flex items-stretch">
                {/* Image (if present) */}
                {current.imageUrl && (
                    <div className="w-1/3 min-h-[120px]">
                        <img
                            src={current.imageUrl}
                            alt={current.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Content */}
                <div className={`flex-1 p-4 ${current.imageUrl ? 'pl-4' : ''}`}>
                    <h3 className="font-semibold text-lg text-primary">
                        {current.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {current.message}
                    </p>

                    {/* Dots indicator */}
                    {announcements.length > 1 && (
                        <div className="flex items-center gap-2 mt-3">
                            <div className="flex gap-1">
                                {announcements.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentIndex(index)}
                                        className={`h-1.5 rounded-full transition-all ${index === currentIndex
                                                ? "w-4 bg-primary"
                                                : "w-1.5 bg-primary/30 hover:bg-primary/50"
                                            }`}
                                    />
                                ))}
                            </div>
                            <span className="text-xs text-muted-foreground ml-auto">
                                {currentIndex + 1} / {announcements.length}
                            </span>
                        </div>
                    )}
                </div>

                {/* Navigation arrows (show on hover) */}
                {announcements.length > 1 && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 hover:opacity-100 transition-opacity bg-background/80"
                            onClick={prevSlide}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 hover:opacity-100 transition-opacity bg-background/80"
                            onClick={nextSlide}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </div>
        </Card>
    );
};
