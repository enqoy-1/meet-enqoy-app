import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface QuestionOption {
    value: string;
    label: string;
}

interface Question {
    label: string;
    type: "radio" | "scale" | "text" | "checkbox";
    options?: QuestionOption[];
}

interface EditAnswerModalProps {
    isOpen: boolean;
    onClose: () => void;
    questionKey: string;
    question: Question;
    currentValue: any;
    onSave: (questionKey: string, newValue: any) => Promise<void>;
}

export const EditAnswerModal = ({
    isOpen,
    onClose,
    questionKey,
    question,
    currentValue,
    onSave,
}: EditAnswerModalProps) => {
    const [value, setValue] = useState<any>(currentValue);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (value === currentValue) {
            onClose();
            return;
        }

        setIsSaving(true);
        try {
            await onSave(questionKey, value);
        } finally {
            setIsSaving(false);
        }
    };

    const renderInput = () => {
        if (question.type === "text") {
            return (
                <Textarea
                    value={value || ""}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Enter your answer..."
                    className="min-h-[100px]"
                />
            );
        }

        if (question.type === "scale") {
            return (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        {[1, 2, 3, 4, 5].map((num) => (
                            <Button
                                key={num}
                                type="button"
                                variant={value === num ? "default" : "outline"}
                                className="w-12 h-12"
                                onClick={() => setValue(num)}
                            >
                                {num}
                            </Button>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Strongly Disagree</span>
                        <span>Strongly Agree</span>
                    </div>
                </div>
            );
        }

        if ((question.type === "radio" || (question.type as string) === "select") && question.options) {
            return (
                <RadioGroup value={String(value)} onValueChange={setValue}>
                    {question.options.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={option.value} />
                            <Label htmlFor={option.value} className="cursor-pointer">
                                {option.label}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            );
        }

        if (question.type === "checkbox" && question.options) {
            return (
                <div className="space-y-3">
                    {question.options.map((option) => {
                        const currentValues = Array.isArray(value) ? value : [];
                        const isChecked = currentValues.includes(option.value);

                        const handleCheckedChange = (checked: boolean) => {
                            if (checked) {
                                setValue([...currentValues, option.value]);
                            } else {
                                setValue(currentValues.filter((v: string) => v !== option.value));
                            }
                        };

                        return (
                            <div key={option.value} className="flex items-center space-x-2">
                                <Checkbox
                                    id={option.value}
                                    checked={isChecked}
                                    onCheckedChange={handleCheckedChange}
                                />
                                <Label htmlFor={option.value} className="cursor-pointer">
                                    {option.label}
                                </Label>
                            </div>
                        );
                    })}
                </div>
            );
        }

        return null;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Answer</DialogTitle>
                    <DialogDescription>{question.label}</DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {renderInput()}
                </div>

                <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
