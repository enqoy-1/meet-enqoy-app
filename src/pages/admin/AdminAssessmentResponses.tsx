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
      "City",
      "Preferred Time",
      "Dinner Vibe",
      "Talk Topic",
      "Group Dynamic",
      "Humor Type",
      "Wardrobe Style",
      "Introvert Scale",
      "Alone Time Scale",
      "Family Scale",
      "Spirituality Scale",
      "Humor Scale",
      "Meeting Priority",
      "Dietary Preferences",
      "Custom Dietary",
      "Restaurant Frequency",
      "Spending",
      "Gender",
      "Relationship Status",
      "Has Children",
      "Country",
      "Birthday",
      "Nickname",
      "Never Guess",
      "Fun Fact",
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
                    <TableHead className="min-w-[150px]">Name</TableHead>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead className="min-w-[120px]">Submitted</TableHead>
                    <TableHead className="min-w-[120px]">City</TableHead>
                    <TableHead className="min-w-[140px]">Preferred Time</TableHead>
                    <TableHead className="min-w-[140px]">Dinner Vibe</TableHead>
                    <TableHead className="min-w-[140px]">Talk Topic</TableHead>
                    <TableHead className="min-w-[140px]">Group Dynamic</TableHead>
                    <TableHead className="min-w-[140px]">Humor Type</TableHead>
                    <TableHead className="min-w-[140px]">Wardrobe Style</TableHead>
                    <TableHead className="min-w-[140px]">Introvert Scale</TableHead>
                    <TableHead className="min-w-[140px]">Alone Time Scale</TableHead>
                    <TableHead className="min-w-[140px]">Family Importance</TableHead>
                    <TableHead className="min-w-[140px]">Spirituality</TableHead>
                    <TableHead className="min-w-[140px]">Humor Importance</TableHead>
                    <TableHead className="min-w-[140px]">Meeting Priority</TableHead>
                    <TableHead className="min-w-[160px]">Dietary Preferences</TableHead>
                    <TableHead className="min-w-[160px]">Custom Dietary</TableHead>
                    <TableHead className="min-w-[160px]">Restaurant Frequency</TableHead>
                    <TableHead className="min-w-[140px]">Spending Range</TableHead>
                    <TableHead className="min-w-[100px]">Gender</TableHead>
                    <TableHead className="min-w-[160px]">Relationship Status</TableHead>
                    <TableHead className="min-w-[120px]">Has Children</TableHead>
                    <TableHead className="min-w-[120px]">Country</TableHead>
                    <TableHead className="min-w-[120px]">Birthday</TableHead>
                    <TableHead className="min-w-[140px]">Nickname</TableHead>
                    <TableHead className="min-w-[250px]">Never Guess About Me</TableHead>
                    <TableHead className="min-w-[250px]">Fun Fact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponses.map((response) => {
                    const answers = response.answers;
                    return (
                      <TableRow key={response.id}>
                        <TableCell className="font-medium">
                          {response.profiles?.full_name || "N/A"}
                        </TableCell>
                        <TableCell>{response.profiles?.email || "N/A"}</TableCell>
                        <TableCell>
                          {new Date(response.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{formatAnswer("city", answers.city)}</TableCell>
                        <TableCell>{formatAnswer("preferredTime", answers.preferredTime)}</TableCell>
                        <TableCell>{formatAnswer("dinnerVibe", answers.dinnerVibe)}</TableCell>
                        <TableCell>{formatAnswer("talkTopic", answers.talkTopic)}</TableCell>
                        <TableCell>{formatAnswer("groupDynamic", answers.groupDynamic)}</TableCell>
                        <TableCell>{formatAnswer("humorType", answers.humorType)}</TableCell>
                        <TableCell>{formatAnswer("wardrobeStyle", answers.wardrobeStyle)}</TableCell>
                        <TableCell>{answers.introvertScale}/5</TableCell>
                        <TableCell>{answers.aloneTimeScale}/5</TableCell>
                        <TableCell>{answers.familyScale}/5</TableCell>
                        <TableCell>{answers.spiritualityScale}/5</TableCell>
                        <TableCell>{answers.humorScale}/5</TableCell>
                        <TableCell>{formatAnswer("meetingPriority", answers.meetingPriority)}</TableCell>
                        <TableCell>{formatAnswer("dietaryPreferences", answers.dietaryPreferences)}</TableCell>
                        <TableCell>{formatAnswer("customDietary", answers.customDietary)}</TableCell>
                        <TableCell>{formatAnswer("restaurantFrequency", answers.restaurantFrequency)}</TableCell>
                        <TableCell>{formatAnswer("spending", answers.spending)}</TableCell>
                        <TableCell>{formatAnswer("gender", answers.gender)}</TableCell>
                        <TableCell>{formatAnswer("relationshipStatus", answers.relationshipStatus)}</TableCell>
                        <TableCell>{formatAnswer("hasChildren", answers.hasChildren)}</TableCell>
                        <TableCell>{formatAnswer("country", answers.country)}</TableCell>
                        <TableCell>{formatAnswer("birthday", answers.birthday)}</TableCell>
                        <TableCell>{formatAnswer("nickName", answers.nickName)}</TableCell>
                        <TableCell className="whitespace-normal max-w-[250px]">
                          {formatAnswer("neverGuess", answers.neverGuess)}
                        </TableCell>
                        <TableCell className="whitespace-normal max-w-[250px]">
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
