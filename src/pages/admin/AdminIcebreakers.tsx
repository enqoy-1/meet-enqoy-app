import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { IceBreakerGame } from "@/components/IceBreakerGame";

interface IcebreakerQuestion {
  id: string;
  question_text: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminIcebreakers() {
  const [questions, setQuestions] = useState<IcebreakerQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IcebreakerQuestion | null>(null);
  const [formData, setFormData] = useState({
    question_text: "",
    is_active: true
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("icebreaker_questions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q =>
    q.question_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ["Question", "Active", "Created At"];
    const csvContent = [
      headers.join(","),
      ...filteredQuestions.map(q => [
        `"${q.question_text}"`,
        q.is_active ? "Yes" : "No",
        new Date(q.created_at).toLocaleDateString()
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
        const { error } = await supabase
          .from("icebreaker_questions")
          .update(formData)
          .eq("id", editingQuestion.id);
        if (error) throw error;
        toast.success("Question updated successfully");
      } else {
        const { error } = await supabase
          .from("icebreaker_questions")
          .insert([formData]);
        if (error) throw error;
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
      const { error } = await supabase
        .from("icebreaker_questions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Question deleted successfully");
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleActive = async (question: IcebreakerQuestion) => {
    try {
      const { error } = await supabase
        .from("icebreaker_questions")
        .update({ is_active: !question.is_active })
        .eq("id", question.id);
      if (error) throw error;
      toast.success(`Question ${!question.is_active ? "activated" : "deactivated"}`);
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openEditDialog = (question: IcebreakerQuestion) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      is_active: question.is_active
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingQuestion(null);
    setFormData({ question_text: "", is_active: true });
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
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="question_text">Question *</Label>
                    <Input
                      id="question_text"
                      value={formData.question_text}
                      onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">Active</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
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
                      <TableCell className="font-medium">{question.question_text}</TableCell>
                      <TableCell>
                        <Button
                          variant={question.is_active ? "default" : "secondary"}
                          size="sm"
                          onClick={() => toggleActive(question)}
                        >
                          {question.is_active ? "Active" : "Inactive"}
                        </Button>
                      </TableCell>
                      <TableCell>{new Date(question.created_at).toLocaleDateString()}</TableCell>
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
