import { useState, useEffect } from "react";
import { icebreakersApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Download, Eye, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { IceBreakerGame } from "@/components/IceBreakerGame";

interface IcebreakerQuestion {
  id: string;
  question: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminIcebreakers() {
  const [questions, setQuestions] = useState<IcebreakerQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IcebreakerQuestion | null>(null);
  const [formData, setFormData] = useState({
    questionText: "",
    isActive: true
  });
  const [bulkQuestions, setBulkQuestions] = useState("");

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const data = await icebreakersApi.getAll();
      setQuestions(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q =>
    q.question?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ["Question", "Active", "Created At"];
    const csvContent = [
      headers.join(","),
      ...filteredQuestions.map(q => [
        `"${q.question}"`,
        q.isActive ? "Yes" : "No",
        new Date(q.createdAt).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `icebreaker-questions-${new Date().toISOString()}.csv`;
    a.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuestion) {
        await icebreakersApi.update(editingQuestion.id, formData);
        toast.success("Question updated successfully");
      } else {
        await icebreakersApi.create(formData.questionText);
        toast.success("Question created successfully");
      }
      setIsDialogOpen(false);
      resetForm();
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await icebreakersApi.delete(id);
      toast.success("Question deleted successfully");
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleActive = async (question: IcebreakerQuestion) => {
    try {
      await icebreakersApi.update(question.id, { isActive: !question.isActive });
      toast.success(`Question ${!question.isActive ? "activated" : "deactivated"}`);
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openEditDialog = (question: IcebreakerQuestion) => {
    setEditingQuestion(question);
    setFormData({
      questionText: question.question,
      isActive: question.isActive
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingQuestion(null);
    setFormData({ questionText: "", isActive: true });
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const lines = bulkQuestions.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        toast.error("Please enter at least one question");
        return;
      }

      // Create questions one by one
      for (const line of lines) {
        await icebreakersApi.create(line.trim());
      }

      toast.success(`${lines.length} questions uploaded successfully`);
      setIsBulkUploadOpen(false);
      setBulkQuestions("");
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('Question')); // Skip header row

        if (lines.length === 0) {
          toast.error("No valid questions found in file");
          return;
        }

        // Create questions one by one
        for (const line of lines) {
          await icebreakersApi.create(line.replace(/^"|"$/g, '').trim());
        }

        toast.success(`${lines.length} questions uploaded successfully`);
        setIsBulkUploadOpen(false);
        fetchQuestions();
      } catch (error: any) {
        toast.error(error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Icebreaker Questions</h1>
            <p className="text-muted-foreground">Manage icebreaker questions</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsGameOpen(true)} variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Preview Game
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Bulk Upload Questions</DialogTitle>
                  <DialogDescription>
                    Upload multiple icebreaker questions at once by pasting them or uploading a file.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBulkUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="bulk_questions">Paste Questions (one per line)</Label>
                    <Textarea
                      id="bulk_questions"
                      value={bulkQuestions}
                      onChange={(e) => setBulkQuestions(e.target.value)}
                      placeholder="What's your favorite childhood memory?&#10;If you could have dinner with anyone, who would it be?&#10;What's the best advice you've ever received?"
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <Button type="submit" className="flex-1">
                      Upload Questions
                    </Button>
                    <div className="relative">
                      <Input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Button type="button" variant="outline" className="pointer-events-none">
                        Or Upload File
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tip: You can paste text or upload a CSV/TXT file with one question per line
                  </p>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingQuestion ? "Edit Question" : "Add New Question"}</DialogTitle>
                  <DialogDescription>
                    {editingQuestion ? "Update the icebreaker question details." : "Create a new icebreaker question for events."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="questionText">Question *</Label>
                    <Input
                      id="questionText"
                      value={formData.questionText}
                      onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isActive">Active</Label>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingQuestion ? "Update" : "Create"} Question
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <Input
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium">{question.question}</TableCell>
                      <TableCell>
                        <Button
                          variant={question.isActive ? "default" : "secondary"}
                          size="sm"
                          onClick={() => toggleActive(question)}
                        >
                          {question.isActive ? "Active" : "Inactive"}
                        </Button>
                      </TableCell>
                      <TableCell>{new Date(question.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(question)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(question.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ice Breaker Game Preview */}
      <IceBreakerGame
        isOpen={isGameOpen}
        onClose={() => setIsGameOpen(false)}
        eventId="preview"
      />
    </AdminLayout>
  );
}
