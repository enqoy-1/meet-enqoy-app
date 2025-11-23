import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
}

interface Constraint {
  id: string;
  type: "not_with" | "must_with" | "keep_group_together" | "balance_gender" | "max_group_size";
  subject_guest_ids: string[];
  target_guest_ids: string[] | null;
  notes: string | null;
}

interface ConstraintsManagerProps {
  eventId: string;
  guests: Guest[];
  constraints: Constraint[];
  onRefresh: () => void;
}

export const ConstraintsManager = ({ eventId, guests, constraints, onRefresh }: ConstraintsManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newConstraint, setNewConstraint] = useState({
    type: "not_with" as Constraint["type"],
    subject_guest_ids: [] as string[],
    target_guest_ids: [] as string[],
    notes: "",
  });

  const handleAddConstraint = async () => {
    if (newConstraint.subject_guest_ids.length === 0) {
      toast.error("Please select at least one guest");
      return;
    }

    if (
      (newConstraint.type === "not_with" || newConstraint.type === "must_with") &&
      newConstraint.target_guest_ids.length === 0
    ) {
      toast.error("Please select target guests");
      return;
    }

    try {
      const { error } = await supabase.from("pairing_constraints").insert({
        event_id: eventId,
        type: newConstraint.type,
        subject_guest_ids: newConstraint.subject_guest_ids,
        target_guest_ids: newConstraint.target_guest_ids.length > 0 ? newConstraint.target_guest_ids : null,
        notes: newConstraint.notes || null,
      });

      if (error) throw error;

      toast.success("Constraint added successfully");
      setIsDialogOpen(false);
      setNewConstraint({
        type: "not_with",
        subject_guest_ids: [],
        target_guest_ids: [],
        notes: "",
      });
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to add constraint");
    }
  };

  const handleDeleteConstraint = async (id: string) => {
    try {
      const { error } = await supabase.from("pairing_constraints").delete().eq("id", id);

      if (error) throw error;

      toast.success("Constraint deleted");
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to delete constraint");
    }
  };

  const getGuestName = (id: string) => {
    const guest = guests.find(g => g.id === id);
    return guest ? `${guest.first_name} ${guest.last_name}` : "Unknown";
  };

  const constraintTypeLabels = {
    not_with: "Do Not Pair With",
    must_with: "Must Pair With",
    keep_group_together: "Keep Group Together",
    balance_gender: "Balance Gender",
    max_group_size: "Max Group Size",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Create rules to control how guests are paired
        </p>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Constraint
        </Button>
      </div>

      <div className="space-y-4">
        {constraints.map(constraint => (
          <Card key={constraint.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">
                    {constraintTypeLabels[constraint.type]}
                  </CardTitle>
                  {constraint.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{constraint.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteConstraint(constraint.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Subject Guests:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {constraint.subject_guest_ids.map(id => (
                      <Badge key={id} variant="secondary">
                        {getGuestName(id)}
                      </Badge>
                    ))}
                  </div>
                </div>
                {constraint.target_guest_ids && constraint.target_guest_ids.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Target Guests:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {constraint.target_guest_ids.map(id => (
                        <Badge key={id} variant="outline">
                          {getGuestName(id)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {constraints.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No constraints added yet</p>
          </CardContent>
        </Card>
      )}

      {/* Add Constraint Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Pairing Constraint</DialogTitle>
            <DialogDescription>
              Create a rule to control how guests are paired
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Constraint Type</Label>
              <Select
                value={newConstraint.type}
                onValueChange={(value: Constraint["type"]) =>
                  setNewConstraint({ ...newConstraint, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_with">Do Not Pair With</SelectItem>
                  <SelectItem value="must_with">Must Pair With</SelectItem>
                  <SelectItem value="keep_group_together">Keep Group Together</SelectItem>
                  <SelectItem value="balance_gender">Balance Gender</SelectItem>
                  <SelectItem value="max_group_size">Max Group Size</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject Guests</Label>
              <Select
                value=""
                onValueChange={(guestId) => {
                  if (!newConstraint.subject_guest_ids.includes(guestId)) {
                    setNewConstraint({
                      ...newConstraint,
                      subject_guest_ids: [...newConstraint.subject_guest_ids, guestId],
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select guests..." />
                </SelectTrigger>
                <SelectContent>
                  {guests.map(guest => (
                    <SelectItem key={guest.id} value={guest.id}>
                      {guest.first_name} {guest.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-1 mt-2">
                {newConstraint.subject_guest_ids.map(id => (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() =>
                      setNewConstraint({
                        ...newConstraint,
                        subject_guest_ids: newConstraint.subject_guest_ids.filter(gid => gid !== id),
                      })
                    }
                  >
                    {getGuestName(id)} ✕
                  </Badge>
                ))}
              </div>
            </div>

            {(newConstraint.type === "not_with" || newConstraint.type === "must_with") && (
              <div className="space-y-2">
                <Label>Target Guests</Label>
                <Select
                  value=""
                  onValueChange={(guestId) => {
                    if (!newConstraint.target_guest_ids.includes(guestId)) {
                      setNewConstraint({
                        ...newConstraint,
                        target_guest_ids: [...newConstraint.target_guest_ids, guestId],
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target guests..." />
                  </SelectTrigger>
                  <SelectContent>
                    {guests.map(guest => (
                      <SelectItem key={guest.id} value={guest.id}>
                        {guest.first_name} {guest.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1 mt-2">
                  {newConstraint.target_guest_ids.map(id => (
                    <Badge
                      key={id}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() =>
                        setNewConstraint({
                          ...newConstraint,
                          target_guest_ids: newConstraint.target_guest_ids.filter(gid => gid !== id),
                        })
                      }
                    >
                      {getGuestName(id)} ✕
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newConstraint.notes}
                onChange={(e) => setNewConstraint({ ...newConstraint, notes: e.target.value })}
                placeholder="Additional notes about this constraint"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddConstraint}>Add Constraint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};