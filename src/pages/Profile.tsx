import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft, Ticket, Edit2, RefreshCw, LogOut,
    MessageCircle, Sparkles, Utensils, User, Heart
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usersApi, assessmentsApi } from "@/api";
import { EditAnswerModal } from "@/components/EditAnswerModal";

interface PersonalityCategory {
    category: string | null;
    scores: Record<string, number> | null;
    description: string | null;
    bestPairings: string[] | null;
    hasAssessment: boolean;
}

interface AssessmentQuestion {
    id: string;
    key: string;
    label: string;
    type: string;
    section: string;
    order: number;
    options: { value: string; label: string }[];
}

const SECTIONS = [
    { id: "social", label: "Social Preferences", icon: MessageCircle, color: "bg-blue-500" },
    { id: "personality", label: "Personality", icon: Sparkles, color: "bg-purple-500" },
    { id: "lifestyle", label: "Lifestyle", icon: Utensils, color: "bg-orange-500" },
    { id: "personal", label: "Personal", icon: User, color: "bg-green-500" },
    { id: "fun", label: "Fun Facts", icon: Heart, color: "bg-pink-500" },
];

const CATEGORY_EMOJIS: Record<string, string> = {
    Trailblazers: "🚀",
    Storytellers: "📖",
    Philosophers: "🧠",
    Planners: "📋",
    "Free Spirits": "🌊",
};

const Profile = () => {
    const navigate = useNavigate();
    const { user, logout, refreshUser } = useAuth();
    const [category, setCategory] = useState<PersonalityCategory | null>(null);
    const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
    const [answers, setAnswers] = useState<Record<string, any> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editingQuestion, setEditingQuestion] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchProfileData();
        }
    }, [user]);

    const fetchProfileData = async () => {
        try {
            const [categoryData, assessmentData, questionsData] = await Promise.all([
                usersApi.getMyCategory(),
                assessmentsApi.getMy(),
                assessmentsApi.getQuestions(user?.profile?.countryId),
            ]);
            setCategory(categoryData);
            setAnswers(assessmentData?.answers || null);
            setQuestions(questionsData || []);
        } catch (error) {
            console.error("Failed to load profile:", error);
            toast.error("Failed to load profile data");
        } finally {
            setIsLoading(false);
        }
    };

    // Create a lookup map for questions by key
    const questionsMap = useMemo(() => {
        return questions.reduce((acc, q) => {
            acc[q.key] = q;
            return acc;
        }, {} as Record<string, AssessmentQuestion>);
    }, [questions]);

    const handleAnswerUpdate = async (questionKey: string, newValue: any) => {
        try {
            await assessmentsApi.updateAnswer(questionKey, newValue);
            toast.success("Updated!");

            // Optimistic update
            setAnswers(prev => prev ? ({ ...prev, [questionKey]: newValue }) : null);

            // Refresh category in background
            const newCategory = await usersApi.getMyCategory();
            setCategory(newCategory);

            setEditingQuestion(null);
        } catch (error) {
            console.error("Failed to update answer:", error);
            toast.error("Failed to update");
        }
    };

    const handleSignOut = () => {
        logout();
        navigate("/");
    };

    const getDisplayValue = (key: string, value: any): string => {
        if (value === undefined || value === null) return "—";
        const question = questionsMap[key];
        if (!question) return String(value);

        if (Array.isArray(value)) {
            // Mapping values to labels for array types (like checkbox)
            if (question.options) {
                return value.map(v => question.options?.find(o => o.value === v)?.label || v).join(", ");
            }
            return value.join(", ");
        }

        if (question.type === "scale") return `${value}/5`;
        if ((question.type === "radio" || question.type === "select") && question.options) {
            return question.options.find((o) => o.value === value)?.label || String(value);
        }
        return String(value);
    };

    const getQuestionsForSection = (sectionId: string) => {
        return questions.filter(q => q.section === sectionId).sort((a, b) => a.order - b.order);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="max-w-5xl mx-auto px-6 py-3 flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-10">
                {/* Hero - Two Column Layout */}
                <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 mb-12">
                    {/* Left - Personality Type */}
                    {category?.hasAssessment && category?.category && (
                        <div className="lg:w-1/3">
                            <span className="text-6xl block mb-4">{CATEGORY_EMOJIS[category.category]}</span>
                            <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-3">
                                {category.category}
                            </h1>
                            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                                {category.description}
                            </p>

                            {category.bestPairings && category.bestPairings.length > 0 && (
                                <div>
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                                        Best matches
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {category.bestPairings.map((p) => (
                                            <span key={p} className="inline-flex items-center gap-1.5 text-sm">
                                                {CATEGORY_EMOJIS[p]} {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Right - Profile Info */}
                    <div className="lg:flex-1">
                        <div className="flex items-start gap-4 mb-6">
                            <Avatar className="h-16 w-16 ring-2 ring-border">
                                <AvatarFallback className="bg-muted text-foreground text-xl font-semibold">
                                    {user?.profile?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl font-semibold">
                                    {user?.profile?.firstName && user?.profile?.lastName
                                        ? `${user.profile.firstName} ${user.profile.lastName}`
                                        : user?.profile?.firstName || "User"}
                                </h2>
                                <p className="text-muted-foreground text-sm">{user?.email}</p>
                                {user?.profile?.city && (
                                    <p className="text-muted-foreground text-sm">{user.profile.city}</p>
                                )}
                            </div>
                            {(user?.profile?.eventCredits || 0) > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="flex-shrink-0 cursor-pointer hover:bg-secondary/80"
                                    onClick={() => navigate("/my-credits")}
                                >
                                    <Ticket className="h-3 w-3 mr-1" />
                                    {user?.profile?.eventCredits}
                                </Badge>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-3">
                            <Button variant="outline" size="sm" onClick={() => navigate("/assessment?retake=true")}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {category?.hasAssessment ? "Retake Assessment" : "Take Assessment"}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleSignOut}>
                                <LogOut className="h-4 w-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>

                <Separator className="mb-10" />

                {/* No Assessment Banner */}
                {!category?.hasAssessment && (
                    <div className="mb-10 p-6 rounded-xl bg-primary/5 border border-primary/20">
                        <h3 className="font-semibold text-lg mb-2">Complete Your Assessment</h3>
                        <p className="text-muted-foreground mb-4">
                            Take the personality assessment to discover your type and get matched with like-minded people at our events.
                        </p>
                        <Button onClick={() => navigate("/assessment")} className="bg-primary text-white">
                            Take Assessment
                        </Button>
                    </div>
                )}

                {/* Answers Grid - Show questions even without answers */}
                {SECTIONS.map((section) => {
                    const sectionQuestions = getQuestionsForSection(section.id);

                    // Skip if no questions in this section
                    if (sectionQuestions.length === 0) return null;

                    const Icon = section.icon;

                    return (
                        <div key={section.id} className="mb-10">
                            <div className="flex items-center gap-2 mb-4">
                                <div className={`w-7 h-7 rounded-md ${section.color} flex items-center justify-center`}>
                                    <Icon className="h-3.5 w-3.5 text-white" />
                                </div>
                                <h3 className="font-semibold">{section.label}</h3>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {sectionQuestions.map((question) => {
                                    const value = answers?.[question.key];
                                    const hasValue = value !== undefined && value !== null;

                                    return (
                                        <button
                                            key={question.key}
                                            onClick={() => hasValue ? setEditingQuestion(question.key) : navigate("/assessment")}
                                            className="group text-left p-4 rounded-xl border border-transparent hover:border-border hover:bg-muted/30 transition-all"
                                        >
                                            <p className="text-xs text-muted-foreground mb-1">{question.label}</p>
                                            <p className={`text-sm font-medium ${!hasValue ? "text-muted-foreground/50" : ""}`}>
                                                {getDisplayValue(question.key, value)}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* Edit Modal */}
            {editingQuestion && questionsMap[editingQuestion] && (
                <EditAnswerModal
                    isOpen={!!editingQuestion}
                    onClose={() => setEditingQuestion(null)}
                    questionKey={editingQuestion}
                    question={questionsMap[editingQuestion] as any}
                    currentValue={answers?.[editingQuestion]}
                    onSave={handleAnswerUpdate}
                />
            )}
        </div>
    );
};

export default Profile;
