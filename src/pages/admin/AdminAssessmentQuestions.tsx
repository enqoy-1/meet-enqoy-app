import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { assessmentsApi, countriesApi, Country } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Download, MoveUp, MoveDown } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssessmentQuestion, QuestionOption } from "@/components/assessment/QuestionRenderer";



const PERSONALITY_TYPES = ["Trailblazers", "Storytellers", "Philosophers", "Planners", "Free Spirits"];

const AdminAssessmentQuestions = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState("radio");
  const [section, setSection] = useState("social");
  const [order, setOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [placeholder, setPlaceholder] = useState("");
  const [options, setOptions] = useState<QuestionOption[]>([]);

  // Option editing state
  const [currentOption, setCurrentOption] = useState<QuestionOption>({ value: "", label: "", scores: {} });
  const [showOptionForm, setShowOptionForm] = useState(false);

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (selectedCountryId) {
      fetchQuestions();
    }
  }, [selectedCountryId]);

  const fetchCountries = async () => {
    try {
      const data = await countriesApi.getAll();
      setCountries(data || []);
      // Default to first country (prefer active ones first)
      if (data && data.length > 0) {
        const activeCountries = data.filter((c: Country) => c.isActive);
        setSelectedCountryId(activeCountries.length > 0 ? activeCountries[0].id : data[0].id);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
      toast.error("Failed to load countries");
    }
  };

  const fetchQuestions = async () => {
    if (!selectedCountryId) return;
    try {
      const data = await assessmentsApi.getQuestions(selectedCountryId);
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
      q.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOptionAdd = () => {
    if (!currentOption.value || !currentOption.label) {
      toast.error("Value and Label are required");
      return;
    }
    setOptions([...options, currentOption]);
    setCurrentOption({ value: "", label: "", scores: {} });
    setShowOptionForm(false);
  };

  const handleOptionRemove = (index: number) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const handleScoreChange = (category: string, value: string) => {
    const score = parseInt(value) || 0;
    setCurrentOption(prev => ({
      ...prev,
      scores: {
        ...prev.scores,
        [category]: score
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const questionData = {
        key,
        label,
        type,
        section,
        order,
        isActive,
        placeholder: placeholder || undefined,
        options,
        countryId: selectedCountryId,
      };

      if (editingId) {
        await assessmentsApi.updateQuestion(editingId, questionData);
        toast.success("Question updated successfully");
      } else {
        await assessmentsApi.createQuestion(questionData);
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
      await assessmentsApi.deleteQuestion(questionToDelete);
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

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const index = questions.findIndex(q => q.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const newQuestions = [...questions];
    const temp = newQuestions[index];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    newQuestions[index] = newQuestions[targetIndex];
    newQuestions[targetIndex] = temp;

    // Optimistic update
    setQuestions(newQuestions);

    // Prepare reorder payload
    const payload = newQuestions.map((q, idx) => ({
      id: q.id,
      order: idx + 1
    }));

    try {
      await assessmentsApi.reorderQuestions(payload);
      toast.success("Order updated");
    } catch (e) {
      console.error("Reorder failed", e);
      toast.error("Failed to save order");
      fetchQuestions(); // Revert
    }
  };

  const openEditDialog = (question: AssessmentQuestion) => {
    setEditingId(question.id);
    setKey(question.key);
    setLabel(question.label);
    setType(question.type);
    setSection(question.section);
    setOrder(question.order);
    setIsActive(question.isActive);
    setPlaceholder(question.placeholder || "");
    setOptions(question.options || []);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setKey("");
    setLabel("");
    setType("radio");
    setSection("social");
    setOrder(questions.length + 1);
    setIsActive(true);
    setPlaceholder("");
    setOptions([]);
    setCurrentOption({ value: "", label: "", scores: {} });
  };

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
              <p className="text-muted-foreground">Manage dynamic assessment questions & scoring</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Country Selector */}
            <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Question" : "Add New Question"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="key">Unique Key *</Label>
                      <Input
                        id="key"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="e.g. dinnerVibe"
                        required
                        disabled={!!editingId}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="section">Section *</Label>
                      <Select value={section} onValueChange={setSection}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="social">Social</SelectItem>
                          <SelectItem value="personality">Personality</SelectItem>
                          <SelectItem value="lifestyle">Lifestyle</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Question Type *</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="radio">Radio (Multiple Choice)</SelectItem>
                        <SelectItem value="scale">Scale (1-5)</SelectItem>
                        <SelectItem value="text">Text Input</SelectItem>
                        <SelectItem value="select">Dropdown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="label">Question Label *</Label>
                    <Input
                      id="label"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g. What is your vibe at dinner?"
                      required
                    />
                  </div>

                  {(type === "radio" || type === "select" || type === "scale") && (
                    <Card className="bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center mb-4">
                          <Label>Options & Scoring</Label>
                          <Button type="button" size="sm" variant="outline" onClick={() => setShowOptionForm(!showOptionForm)}>
                            {showOptionForm ? "Cancel" : "Add Option"}
                          </Button>
                        </div>

                        {showOptionForm && (
                          <div className="bg-background p-4 rounded-md border mb-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                placeholder="Value (e.g. observing)"
                                value={currentOption.value}
                                onChange={(e) => setCurrentOption({ ...currentOption, value: e.target.value })}
                              />
                              <Input
                                placeholder="Label (e.g. I prefer to observe)"
                                value={currentOption.label}
                                onChange={(e) => setCurrentOption({ ...currentOption, label: e.target.value })}
                              />
                            </div>
                            <Label className="text-xs text-muted-foreground mt-2 block">Points per Personality</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {PERSONALITY_TYPES.map(pt => (
                                <div key={pt} className="flex items-center gap-2">
                                  <span className="text-xs w-20 truncate" title={pt}>{pt}</span>
                                  <Input
                                    type="number"
                                    className="h-8"
                                    placeholder="0"
                                    value={currentOption.scores?.[pt] || ""}
                                    onChange={(e) => handleScoreChange(pt, e.target.value)}
                                  />
                                </div>
                              ))}
                            </div>
                            <Button type="button" size="sm" onClick={handleOptionAdd} className="w-full">
                              Save Option
                            </Button>
                          </div>
                        )}

                        <div className="space-y-2">
                          {options.map((opt, idx) => (
                            <div key={idx} className="flex justify-between items-start p-2 bg-background border rounded text-sm group">
                              <div>
                                <div className="font-medium">{opt.label || "(No label)"}</div>
                                <div className="text-xs text-muted-foreground">Value: {opt.value || "(empty)"}</div>
                                <div className="flex gap-1 flex-wrap mt-1">
                                  {opt.scores && Object.entries(opt.scores).map(([k, v]) => (
                                    Number(v) > 0 && <Badge key={k} variant="secondary" className="text-[10px] h-4 px-1">{k}: +{v}</Badge>
                                  ))}
                                </div>
                              </div>
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleOptionRemove(idx)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {options.length === 0 && <div className="text-center text-sm text-muted-foreground">No options added yet</div>}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">{editingId ? "Update Question" : "Create Question"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Order</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Key</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.sort((a, b) => a.order - b.order).map((question, index) => (
                <TableRow key={question.id}>
                  <TableCell>
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        disabled={index === 0}
                        onClick={() => handleMove(question.id, 'up')}
                      >
                        <MoveUp className="h-3 w-3" />
                      </Button>
                      <span className="font-mono text-xs font-bold">{question.order}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        disabled={index === filteredQuestions.length - 1}
                        onClick={() => handleMove(question.id, 'down')}
                      >
                        <MoveDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{question.label}</div>
                    <div className="text-xs text-muted-foreground">{question.options?.length || 0} options</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{question.type}</Badge>
                    <div className="text-xs text-muted-foreground mt-1 capitalize">{question.section}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{question.key}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(question)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setQuestionToDelete(question.id); setDeleteDialogOpen(true); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this question and its history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAssessmentQuestions;