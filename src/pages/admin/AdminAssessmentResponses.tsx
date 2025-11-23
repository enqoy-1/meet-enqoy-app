import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AssessmentResponse {
  id: string;
  user_id: string;
  answers: any;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

const AdminAssessmentResponses = () => {
  const navigate = useNavigate();
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from("personality_assessments")
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error("Error fetching responses:", error);
      toast.error("Failed to fetch assessment responses");
    } finally {
      setLoading(false);
    }
  };

  const filteredResponses = responses.filter((response) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      response.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      response.profiles?.email?.toLowerCase().includes(searchLower)
    );
  });

  const escapeCSVCell = (cell: any): string => {
    if (cell == null) return '""';
    const str = String(cell);
    // Always wrap in quotes and escape any internal quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`;
  };

  const exportToCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Submission Date",
      "Which city would you like to attend Enqoy from?",
      "Would you prefer to attend an Enqoy experience during lunch or dinner?",
      "Which statement best describes your vibe at dinner?",
      "If you could talk about one topic all night, what would it be?",
      "What does your ideal group dynamic look like?",
      "What kind of humor do you enjoy?",
      "If your personality were a wardrobe, would it be filled with",
      "I am an introverted person (1-5 scale)",
      "I enjoy spending time alone to recharge and reflect (1-5 scale)",
      "How important is staying close to family and loved ones? (1-5 scale)",
      "How important is having a sense of spirituality or deeper meaning in life? (1-5 scale)",
      "How important is sharing laughter and enjoying humor with others? (1-5 scale)",
      "What's most important to you when meeting new people?",
      "Do you have any dietary preferences or restrictions?",
      "Custom Dietary Restrictions",
      "How often do you go out to restaurants every month?",
      "How much do you usually spend on yourself when out with friends?",
      "Gender",
      "What is your relationship status?",
      "Do you have children?",
      "What country are you from?",
      "When is your birthday?",
      "Nickname",
      "What's one thing people would never guess about you?",
      "Share a fun fact about yourself",
    ];

    const csvData = filteredResponses.map((response) => {
      const answers = response.answers;
      return [
        response.profiles?.full_name || "",
        response.profiles?.email || "",
        new Date(response.created_at).toLocaleDateString(),
        answers.city || "",
        answers.preferredTime || "",
        answers.dinnerVibe || "",
        answers.talkTopic || "",
        answers.groupDynamic || "",
        answers.humorType || "",
        answers.wardrobeStyle || "",
        answers.introvertScale || "",
        answers.aloneTimeScale || "",
        answers.familyScale || "",
        answers.spiritualityScale || "",
        answers.humorScale || "",
        answers.meetingPriority || "",
        answers.dietaryPreferences || "",
        answers.customDietary || "",
        answers.restaurantFrequency || "",
        answers.spending || "",
        answers.gender || "",
        answers.relationshipStatus || "",
        answers.hasChildren || "",
        answers.country || "",
        answers.birthday ? new Date(answers.birthday).toLocaleDateString() : "",
        answers.nickName || "",
        answers.neverGuess || "",
        answers.funFact || "",
      ];
    });

    const csvContent = [
      headers.map(escapeCSVCell).join(","),
      ...csvData.map((row) => row.map(escapeCSVCell).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-responses-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const formatAnswer = (key: string, value: any) => {
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (key === "birthday" && value) return new Date(value).toLocaleDateString();
    return value || "N/A";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Assessment Responses</h1>
        </div>
        <Button onClick={exportToCSV} disabled={filteredResponses.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredResponses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No assessment responses found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 bg-background min-w-[150px]">Name</TableHead>
                    <TableHead className="sticky left-[150px] z-20 bg-background min-w-[200px]">Email</TableHead>
                    <TableHead className="min-w-[120px]">Submitted</TableHead>
                    <TableHead className="min-w-[300px]">Which city would you like to attend Enqoy from?</TableHead>
                    <TableHead className="min-w-[350px]">Would you prefer to attend an Enqoy experience during lunch or dinner?</TableHead>
                    <TableHead className="min-w-[350px]">Which statement best describes your vibe at dinner?</TableHead>
                    <TableHead className="min-w-[350px]">If you could talk about one topic all night, what would it be?</TableHead>
                    <TableHead className="min-w-[300px]">What does your ideal group dynamic look like?</TableHead>
                    <TableHead className="min-w-[300px]">What kind of humor do you enjoy?</TableHead>
                    <TableHead className="min-w-[350px]">If your personality were a wardrobe, would it be filled with</TableHead>
                    <TableHead className="min-w-[300px]">I am an introverted person (1-5 scale)</TableHead>
                    <TableHead className="min-w-[350px]">I enjoy spending time alone to recharge and reflect (1-5 scale)</TableHead>
                    <TableHead className="min-w-[350px]">How important is staying close to family and loved ones? (1-5 scale)</TableHead>
                    <TableHead className="min-w-[400px]">How important is having a sense of spirituality or deeper meaning in life? (1-5 scale)</TableHead>
                    <TableHead className="min-w-[400px]">How important is sharing laughter and enjoying humor with others? (1-5 scale)</TableHead>
                    <TableHead className="min-w-[350px]">What&apos;s most important to you when meeting new people?</TableHead>
                    <TableHead className="min-w-[350px]">Do you have any dietary preferences or restrictions?</TableHead>
                    <TableHead className="min-w-[300px]">Custom Dietary Restrictions</TableHead>
                    <TableHead className="min-w-[350px]">How often do you go out to restaurants every month?</TableHead>
                    <TableHead className="min-w-[400px]">How much do you usually spend on yourself when out with friends?</TableHead>
                    <TableHead className="min-w-[100px]">Gender</TableHead>
                    <TableHead className="min-w-[300px]">What is your relationship status?</TableHead>
                    <TableHead className="min-w-[200px]">Do you have children?</TableHead>
                    <TableHead className="min-w-[250px]">What country are you from?</TableHead>
                    <TableHead className="min-w-[200px]">When is your birthday?</TableHead>
                    <TableHead className="min-w-[140px]">Nickname</TableHead>
                    <TableHead className="min-w-[400px]">What&apos;s one thing people would never guess about you?</TableHead>
                    <TableHead className="min-w-[400px]">Share a fun fact about yourself</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponses.map((response) => {
                    const answers = response.answers;
                    return (
                      <TableRow key={response.id}>
                        <TableCell className="sticky left-0 z-10 bg-background font-medium border-r">
                          {response.profiles?.full_name || "N/A"}
                        </TableCell>
                        <TableCell className="sticky left-[150px] z-10 bg-background border-r">
                          {response.profiles?.email || "N/A"}
                        </TableCell>
                        <TableCell>
                          {new Date(response.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("city", answers.city)}</TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("preferredTime", answers.preferredTime)}</TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("dinnerVibe", answers.dinnerVibe)}</TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("talkTopic", answers.talkTopic)}</TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("groupDynamic", answers.groupDynamic)}</TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("humorType", answers.humorType)}</TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("wardrobeStyle", answers.wardrobeStyle)}</TableCell>
                        <TableCell>{answers.introvertScale}/5</TableCell>
                        <TableCell>{answers.aloneTimeScale}/5</TableCell>
                        <TableCell>{answers.familyScale}/5</TableCell>
                        <TableCell>{answers.spiritualityScale}/5</TableCell>
                        <TableCell>{answers.humorScale}/5</TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("meetingPriority", answers.meetingPriority)}</TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("dietaryPreferences", answers.dietaryPreferences)}</TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("customDietary", answers.customDietary)}</TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("restaurantFrequency", answers.restaurantFrequency)}</TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("spending", answers.spending)}</TableCell>
                        <TableCell>{formatAnswer("gender", answers.gender)}</TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("relationshipStatus", answers.relationshipStatus)}</TableCell>
                        <TableCell>{formatAnswer("hasChildren", answers.hasChildren)}</TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("country", answers.country)}</TableCell>
                        <TableCell>{formatAnswer("birthday", answers.birthday)}</TableCell>
                        <TableCell className="whitespace-normal">{formatAnswer("nickName", answers.nickName)}</TableCell>
                        <TableCell className="whitespace-normal">
                          {formatAnswer("neverGuess", answers.neverGuess)}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {formatAnswer("funFact", answers.funFact)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAssessmentResponses;
