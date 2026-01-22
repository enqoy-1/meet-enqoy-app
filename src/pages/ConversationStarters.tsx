
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { icebreakersApi } from "@/api";
import { toast } from "sonner";

interface Question {
    id: string;
    question: string;
    questionText?: string;
    category: string;
    isActive: boolean;
}

interface CategoryGroup {
    name: string;
    color: string;
    textColor: string;
    questions: Question[];
}

// Using brand-aligned soft colors
const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
    "Icebreakers": { bg: "bg-emerald-100", text: "text-emerald-800" },
    "Getting Personal": { bg: "bg-rose-100", text: "text-rose-800" },
    "Deep Dive": { bg: "bg-violet-100", text: "text-violet-800" },
    "Fun & Light": { bg: "bg-amber-100", text: "text-amber-800" },
    "Quirky": { bg: "bg-sky-100", text: "text-sky-800" },
};

export default function ConversationStarters() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [categories, setCategories] = useState<CategoryGroup[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<CategoryGroup | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        fetchQuestions();
    }, [id]);

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
                // Normalize question field
                const normalized = data.map((q: any) => ({
                    ...q,
                    questionText: q.questionText || q.question,
                    category: q.category || "Icebreakers"
                }));

                // Group by category
                const grouped: Record<string, Question[]> = {};
                normalized.forEach((q: Question) => {
                    if (!grouped[q.category]) {
                        grouped[q.category] = [];
                    }
                    grouped[q.category].push(q);
                });

                // Convert to array with colors
                const categoryList = Object.entries(grouped).map(([name, questions]) => ({
                    name,
                    color: CATEGORY_STYLES[name]?.bg || "bg-gray-100",
                    textColor: CATEGORY_STYLES[name]?.text || "text-gray-800",
                    questions: questions.sort(() => Math.random() - 0.5)
                }));

                setCategories(categoryList);
            } else {
                setCategories([]);
            }
        } catch (error) {
            console.error("Failed to fetch questions:", error);
            toast.error("Failed to load conversation starters");
        } finally {
            setIsLoading(false);
        }
    };

    const handleShuffle = () => {
        if (selectedCategory) {
            const shuffled = [...selectedCategory.questions].sort(() => Math.random() - 0.5);
            setSelectedCategory({ ...selectedCategory, questions: shuffled });
            api?.scrollTo(0);
            toast.success("Questions shuffled!");
        }
    };

    const handleBack = () => {
        if (selectedCategory) {
            setSelectedCategory(null);
            setCurrent(0);
        } else {
            navigate(`/events/${id}`);
        }
    };

    // Category Selection View
    if (!selectedCategory) {
        return (
            <div className="min-h-screen bg-[#f5f0e8] flex flex-col">
                {/* Header */}
                <header className="sticky top-0 z-10 bg-[#f5f0e8]/95 backdrop-blur-sm border-b border-[#e5dcc7]">
                    <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={() => navigate(`/events/${id}`)}
                            className="text-slate-700 hover:bg-white/60"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Event
                        </Button>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8">
                    <div className="text-center mb-8 max-w-2xl mx-auto space-y-2">
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                            Conversation Starters
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Choose a category to get the conversation going.
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center flex-1 py-20">
                            <div className="animate-pulse text-muted-foreground text-lg">Loading categories...</div>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm border border-[#e5dcc7]">
                            <p className="text-lg text-slate-800 mb-2">No conversation starters available yet</p>
                            <p className="text-muted-foreground">Check back closer to the event time!</p>
                            <Button onClick={() => navigate(`/events/${id}`)} className="mt-4" variant="outline">
                                Return to Event
                            </Button>
                        </div>
                    ) : (
                        <div className="max-w-md mx-auto space-y-4">
                            {categories.map((category) => (
                                <Card
                                    key={category.name}
                                    className={`${category.color} border-0 cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl`}
                                    onClick={() => setSelectedCategory(category)}
                                >
                                    <CardContent className="p-8 min-h-[180px] flex flex-col justify-end">
                                        <h3 className={`text-2xl font-bold ${category.textColor} mb-1`}>
                                            {category.name}
                                        </h3>
                                        <p className={`text-sm ${category.textColor} opacity-70 font-medium`}>
                                            {category.questions.length} cards
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        );
    }

    // Question Cards View (inside a category)
    return (
        <div className="min-h-screen bg-[#f5f0e8] flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-[#f5f0e8]/95 backdrop-blur-sm border-b border-[#e5dcc7]">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        className="text-slate-700 hover:bg-white/60"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-lg font-semibold text-slate-800">
                        {selectedCategory.name}
                    </h1>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleShuffle}
                        className="text-slate-700 hover:bg-white/60"
                    >
                        <Shuffle className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-4">
                <Carousel
                    setApi={setApi}
                    opts={{
                        align: "center",
                        loop: false,
                    }}
                    className="w-full max-w-lg"
                >
                    <CarouselContent className="py-8">
                        {selectedCategory.questions.map((question, index) => (
                            <CarouselItem key={question.id} className="basis-full px-4">
                                <div
                                    className={`transition-all duration-500 ease-out transform-gpu ${index === current
                                        ? 'scale-100 opacity-100 rotate-0 z-10'
                                        : index < current
                                            ? 'scale-[0.85] opacity-40 -rotate-6 -translate-x-4 z-0'
                                            : 'scale-[0.85] opacity-40 rotate-6 translate-x-4 z-0'
                                        }`}
                                    style={{
                                        transformOrigin: index === current ? 'center' : index < current ? 'right center' : 'left center'
                                    }}
                                >
                                    <Card
                                        className="relative overflow-hidden border border-[#e5dcc7] rounded-3xl bg-[#faf8f5] shadow-2xl"
                                        style={{ minHeight: '65vh' }}
                                    >
                                        <CardContent className="h-full min-h-[65vh] flex items-center justify-center p-8 md:p-12">
                                            <p className="text-2xl md:text-3xl lg:text-4xl font-serif text-slate-800 leading-relaxed text-center">
                                                {question.questionText || question.question}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>

                {/* Pagination dots */}
                <div className="mt-6 flex flex-col items-center gap-4">
                    <div className="flex gap-2">
                        {selectedCategory.questions.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => api?.scrollTo(index)}
                                className={`h-2 rounded-full transition-all duration-300 ${index === current
                                    ? "w-8 bg-primary"
                                    : "w-2 bg-slate-300 hover:bg-slate-400"
                                    }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                        {current + 1} of {selectedCategory.questions.length}
                    </p>
                </div>

                {/* View more packs link */}
                <Button
                    variant="ghost"
                    className="mt-8 text-muted-foreground hover:text-slate-800"
                    onClick={handleBack}
                >
                    View more packs
                </Button>
            </main>
        </div>
    );
}
