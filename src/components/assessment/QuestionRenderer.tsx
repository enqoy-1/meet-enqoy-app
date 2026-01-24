import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Define shared types here or import from a shared location if available
export interface QuestionOption {
    value: string;
    label: string;
    scores?: Record<string, number>;
}

export interface AssessmentQuestion {
    id: string;
    key: string;
    label: string;
    type: string;
    section: string;
    order: number;
    options: QuestionOption[];
    isActive: boolean;
    placeholder?: string;
    countryId?: string;
}

interface QuestionRendererProps {
    question: AssessmentQuestion;
    value: any;
    onChange: (value: any) => void;
}

export const QuestionRenderer = ({ question, value, onChange }: QuestionRendererProps) => {
    const { type, options, label, placeholder, key } = question;

    const renderContent = () => {
        switch (type) {
            case "radio":
                return (
                    <RadioGroup value={value || ""} onValueChange={onChange}>
                        {options.map((opt, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                                <RadioGroupItem value={opt.value} id={`${key}-${opt.value}`} />
                                <Label htmlFor={`${key}-${opt.value}`} className="font-normal cursor-pointer">
                                    {opt.label}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                );

            case "scale":
                // 1-5 Scale
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                            {[1, 2, 3, 4, 5].map((num) => (
                                <Button
                                    key={num}
                                    type="button"
                                    variant={value === num ? "default" : "outline"}
                                    className="w-12 h-12"
                                    onClick={() => onChange(num)}
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

            case "text":
                return (
                    <Input
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder || "Type your answer here..."}
                    />
                );

            case "textarea": // Fallback or explicit type
                return (
                    <Textarea
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder || "Type your answer here..."}
                    />
                );

            case "select":
                return (
                    <Select value={value || ""} onValueChange={onChange}>
                        <SelectTrigger>
                            <SelectValue placeholder={placeholder || "Select an option"} />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((opt, idx) => (
                                <SelectItem key={idx} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );

            case "date":
                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !value && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={value ? new Date(value) : undefined}
                                onSelect={(date) => onChange(date ? date.toISOString() : "")}
                                initialFocus
                                captionLayout="dropdown-buttons"
                                fromYear={1900}
                                toYear={new Date().getFullYear()}
                            />
                        </PopoverContent>
                    </Popover>
                );

            default:
                return <div className="text-red-500">Unsupported question type: {type}</div>;
        }
    };

    return (
        <div className="space-y-4">
            <Label className="text-base">{label}</Label>
            {renderContent()}
        </div>
    );
};
