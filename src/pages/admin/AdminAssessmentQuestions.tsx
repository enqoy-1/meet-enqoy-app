import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AssessmentQuestion {
  id: string;
  step_number: number;
  question_type: string;
  question_text: string;
  description: string | null;
  options: any;
  is_required: boolean;
  is_active: boolean;
  section_title: string | null;
  section_description: string | null;
  placeholder_text: string | null;
  validation_rules: any;
  display_order: number;
  created_at: string;
}

const AdminAssessmentQuestions = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stepNumber, setStepNumber] = useState<number>(1);
  const [questionType, setQuestionType] = useState("radio");
  const [questionText, setQuestionText] = useState("");
  const [description, setDescription] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [placeholderText, setPlaceholderText] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(1);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("assessment_questions")
        .select("*")
        .order("step_number", { ascending: true })
        .order("display_order", { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(
    (q) =>
      q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.question_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ["Step", "Type", "Question", "Active", "Required", "Display Order"];
    const rows = questions.map((q) => [
      q.step_number,
      q.question_type,
      q.question_text,
      q.is_active ? "Yes" : "No",
      q.is_required ? "Yes" : "No",
      q.display_order,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "assessment_questions.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseOptions = (optionsText: string) => {
    if (!optionsText.trim()) return null;
    
    try {
      // Format: value1:label1,value2:label2
      const options = optionsText.split(",").map((opt) => {
        const [value, label] = opt.trim().split(":");
        return { value: value.trim(), label: (label || value).trim() };
      });
      return options;
    } catch (error) {
      toast.error("Invalid options format. Use: value1:label1,value2:label2");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const options = parseOptions(optionsText);
      
      const questionData = {
        step_number: stepNumber,
        question_type: questionType,
        question_text: questionText,
        description: description || null,
        options,
        is_required: isRequired,
        is_active: isActive,
        section_title: sectionTitle || null,
        section_description: sectionDescription || null,
        placeholder_text: placeholderText || null,
        display_order: displayOrder,
        validation_rules: null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("assessment_questions")
          .update(questionData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Question updated successfully");
      } else {
        const { error } = await supabase
          .from("assessment_questions")
          .insert(questionData);

        if (error) throw error;
        toast.success("Question added successfully");
      }

      resetForm();
      setIsDialogOpen(false);
      fetchQuestions();
    } catch (error) {
      console.error("Error saving question:", error);
      toast.error("Failed to save question");
    }
  };

  const handleDelete = async () => {
    if (!questionToDelete) return;

    try {
      const { error } = await supabase
        .from("assessment_questions")
        .delete()
        .eq("id", questionToDelete);

      if (error) throw error;
      toast.success("Question deleted successfully");
      fetchQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    } finally {
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("assessment_questions")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success("Question status updated");
      fetchQuestions();
    } catch (error) {
      console.error("Error updating question:", error);
      toast.error("Failed to update question");
    }
  };

  const openEditDialog = (question: AssessmentQuestion) => {
    setEditingId(question.id);
    setStepNumber(question.step_number);
    setQuestionType(question.question_type);
    setQuestionText(question.question_text);
    setDescription(question.description || "");
    setSectionTitle(question.section_title || "");
    setSectionDescription(question.section_description || "");
    setPlaceholderText(question.placeholder_text || "");
    setIsRequired(question.is_required);
    setIsActive(question.is_active);
    setDisplayOrder(question.display_order);
    
    if (question.options && Array.isArray(question.options)) {
      const optionsStr = question.options
        .map((opt: any) => `${opt.value}:${opt.label}`)
        .join(",");
      setOptionsText(optionsStr);
    } else {
      setOptionsText("");
    }
    
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setStepNumber(1);
    setQuestionType("radio");
    setQuestionText("");
    setDescription("");
    setOptionsText("");
    setSectionTitle("");
    setSectionDescription("");
    setPlaceholderText("");
    setIsRequired(true);
    setIsActive(true);
    setDisplayOrder(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Assessment Questions</h1>
              <p className="text-muted-foreground">Manage your assessment questions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Question" : "Add New Question"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stepNumber">Step Number *</Label>
                      <Input
                        id="stepNumber"
                        type="number"
                        min={1}
                        value={stepNumber}
                        onChange={(e) => setStepNumber(parseInt(e.target.value))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayOrder">Display Order *</Label>
                      <Input
                        id="displayOrder"
                        type="number"
                        min={1}
                        value={displayOrder}
                        onChange={(e) => setDisplayOrder(parseInt(e.target.value))}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="questionType">Question Type *</Label>
                    <Select value={questionType} onValueChange={setQuestionType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="radio">Radio (Multiple Choice)</SelectItem>
                        <SelectItem value="scale">Scale (1-5)</SelectItem>
                        <SelectItem value="text">Text Input</SelectItem>
                        <SelectItem value="textarea">Text Area</SelectItem>
                        <SelectItem value="phone">Phone Number</SelectItem>
                        <SelectItem value="date">Date Picker</SelectItem>
                        <SelectItem value="select">Dropdown Select</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="questionText">Question Text *</Label>
                    <Textarea
                      id="questionText"
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      placeholder="Enter the question"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description or helper text"
                    />
                  </div>

                  {(questionType === "radio" || questionType === "select") && (
                    <div className="space-y-2">
                      <Label htmlFor="options">Options (for Radio/Select) *</Label>
                      <Textarea
                        id="options"
                        value={optionsText}
                        onChange={(e) => setOptionsText(e.target.value)}
                        placeholder="Format: value1:Label 1,value2:Label 2,value3:Label 3"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Example: male:Male,female:Female,other:Other
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="sectionTitle">Section Title</Label>
                    <Input
                      id="sectionTitle"
                      value={sectionTitle}
                      onChange={(e) => setSectionTitle(e.target.value)}
                      placeholder="Optional section title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sectionDescription">Section Description</Label>
                    <Textarea
                      id="sectionDescription"
                      value={sectionDescription}
                      onChange={(e) => setSectionDescription(e.target.value)}
                      placeholder="Optional section description"
                    />
                  </div>

                  {(questionType === "text" || questionType === "textarea") && (
                    <div className="space-y-2">
                      <Label htmlFor="placeholderText">Placeholder Text</Label>
                      <Input
                        id="placeholderText"
                        value={placeholderText}
                        onChange={(e) => setPlaceholderText(e.target.value)}
                        placeholder="Placeholder for text input"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isRequired"
                        checked={isRequired}
                        onCheckedChange={setIsRequired}
                      />
                      <Label htmlFor="isRequired">Required</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={isActive}
                        onCheckedChange={setIsActive}
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">{editingId ? "Update" : "Create"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          <div className="text-sm text-muted-foreground">
            {filteredQuestions.length} question(s)
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Step</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No questions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuestions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className="font-medium">{question.step_number}</TableCell>
                    <TableCell>{question.display_order}</TableCell>
                    <TableCell className="capitalize">{question.question_type}</TableCell>
                    <TableCell className="max-w-md truncate">{question.question_text}</TableCell>
                    <TableCell>
                      <span className={question.is_required ? "text-orange-600" : "text-muted-foreground"}>
                        {question.is_required ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(question.id, question.is_active)}
                        className={question.is_active ? "text-green-600" : "text-muted-foreground"}
                      >
                        {question.is_active ? "Active" : "Inactive"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(question)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setQuestionToDelete(question.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the question.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAssessmentQuestions;