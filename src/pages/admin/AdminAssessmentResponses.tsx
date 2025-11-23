import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [selectedResponse, setSelectedResponse] = useState<AssessmentResponse | null>(null);

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
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponses.map((response) => (
                    <TableRow key={response.id}>
                      <TableCell className="font-medium">
                        {response.profiles?.full_name || "N/A"}
                      </TableCell>
                      <TableCell>{response.profiles?.email || "N/A"}</TableCell>
                      <TableCell>
                        {new Date(response.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedResponse(response)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Assessment Response - {selectedResponse?.profiles?.full_name}
            </DialogTitle>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Email</p>
                  <p>{selectedResponse.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Submitted</p>
                  <p>{new Date(selectedResponse.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Question</TableHead>
                    <TableHead>Answer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">City</TableCell>
                    <TableCell>{formatAnswer("city", selectedResponse.answers.city)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Preferred Time</TableCell>
                    <TableCell>{formatAnswer("preferredTime", selectedResponse.answers.preferredTime)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Dinner Vibe</TableCell>
                    <TableCell>{formatAnswer("dinnerVibe", selectedResponse.answers.dinnerVibe)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Talk Topic</TableCell>
                    <TableCell>{formatAnswer("talkTopic", selectedResponse.answers.talkTopic)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Group Dynamic</TableCell>
                    <TableCell>{formatAnswer("groupDynamic", selectedResponse.answers.groupDynamic)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Humor Type</TableCell>
                    <TableCell>{formatAnswer("humorType", selectedResponse.answers.humorType)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Wardrobe Style</TableCell>
                    <TableCell>{formatAnswer("wardrobeStyle", selectedResponse.answers.wardrobeStyle)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Introvert Scale (1-5)</TableCell>
                    <TableCell>{selectedResponse.answers.introvertScale}/5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Alone Time Scale (1-5)</TableCell>
                    <TableCell>{selectedResponse.answers.aloneTimeScale}/5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Family Importance (1-5)</TableCell>
                    <TableCell>{selectedResponse.answers.familyScale}/5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Spirituality (1-5)</TableCell>
                    <TableCell>{selectedResponse.answers.spiritualityScale}/5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Humor Importance (1-5)</TableCell>
                    <TableCell>{selectedResponse.answers.humorScale}/5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Meeting Priority</TableCell>
                    <TableCell>{formatAnswer("meetingPriority", selectedResponse.answers.meetingPriority)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Dietary Preferences</TableCell>
                    <TableCell>
                      {formatAnswer("dietaryPreferences", selectedResponse.answers.dietaryPreferences)}
                      {selectedResponse.answers.customDietary && (
                        <span className="text-muted-foreground"> ({selectedResponse.answers.customDietary})</span>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Restaurant Frequency</TableCell>
                    <TableCell>{formatAnswer("restaurantFrequency", selectedResponse.answers.restaurantFrequency)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Spending Range</TableCell>
                    <TableCell>{formatAnswer("spending", selectedResponse.answers.spending)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Gender</TableCell>
                    <TableCell>{formatAnswer("gender", selectedResponse.answers.gender)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Relationship Status</TableCell>
                    <TableCell>{formatAnswer("relationshipStatus", selectedResponse.answers.relationshipStatus)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Has Children</TableCell>
                    <TableCell>{formatAnswer("hasChildren", selectedResponse.answers.hasChildren)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Country</TableCell>
                    <TableCell>{formatAnswer("country", selectedResponse.answers.country)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Birthday</TableCell>
                    <TableCell>{formatAnswer("birthday", selectedResponse.answers.birthday)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Nickname</TableCell>
                    <TableCell>{formatAnswer("nickName", selectedResponse.answers.nickName)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Never Guess About Me</TableCell>
                    <TableCell className="whitespace-pre-wrap">{formatAnswer("neverGuess", selectedResponse.answers.neverGuess)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Fun Fact</TableCell>
                    <TableCell className="whitespace-pre-wrap">{formatAnswer("funFact", selectedResponse.answers.funFact)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAssessmentResponses;
