import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const Assessment = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form data
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [socialStyle, setSocialStyle] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState("");

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in first");
      navigate("/auth");
      return;
    }
    setUserId(user.id);

    // Check if already completed
    const { data: profile } = await supabase
      .from("profiles")
      .select("assessment_completed, full_name, email")
      .eq("id", user.id)
      .single();

    if (profile?.assessment_completed) {
      toast.info("You've already completed the assessment");
      navigate("/dashboard");
      return;
    }
  };

  const handleNext = () => {
    if (step === 1 && (!fullName || !phone || !age || !gender)) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (step === 2 && (!socialStyle || !preferredTime)) {
      toast.error("Please answer all questions");
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSubmit = async () => {
    if (interests.length === 0) {
      toast.error("Please select at least one interest");
      return;
    }

    if (!userId) {
      toast.error("Authentication error. Please sign in again.");
      navigate("/auth");
      return;
    }

    setIsLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          age: parseInt(age),
          gender: gender as any,
          assessment_completed: true,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Save assessment
      const { error: assessmentError } = await supabase
        .from("personality_assessments")
        .insert({
          user_id: userId,
          answers: {
            social_style: socialStyle,
            preferred_time: preferredTime,
            interests,
            dietary_preferences: dietaryPreferences,
          },
        });

      if (assessmentError) throw assessmentError;

      toast.success("Assessment complete! Welcome to Enqoy!");
      // Small delay to ensure database updates propagate
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 500);
    } catch (error: any) {
      toast.error(error.message || "Failed to save assessment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-2xl shadow-elevated">
        <CardHeader>
          <CardTitle className="text-2xl">Let's Get to Know You</CardTitle>
          <CardDescription>
            Help us match you with the perfect group
          </CardDescription>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+251 912 345 678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25"
                  min="18"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Your Social Style</h3>
              <div className="space-y-2">
                <Label>How would you describe yourself? *</Label>
                <RadioGroup value={socialStyle} onValueChange={setSocialStyle}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="introvert" id="introvert" />
                    <Label htmlFor="introvert" className="cursor-pointer">
                      Introvert - I prefer smaller, intimate gatherings
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ambivert" id="ambivert" />
                    <Label htmlFor="ambivert" className="cursor-pointer">
                      Ambivert - I enjoy both small and large groups
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="extrovert" id="extrovert" />
                    <Label htmlFor="extrovert" className="cursor-pointer">
                      Extrovert - I thrive in larger, energetic groups
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Preferred event time *</Label>
                <RadioGroup value={preferredTime} onValueChange={setPreferredTime}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lunch" id="lunch" />
                    <Label htmlFor="lunch" className="cursor-pointer">
                      Lunch (12:00 - 14:00)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dinner" id="dinner" />
                    <Label htmlFor="dinner" className="cursor-pointer">
                      Dinner (18:00 - 21:00)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both" className="cursor-pointer">
                      Either works for me
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Your Interests</h3>
              <div className="space-y-2">
                <Label>Select your interests (choose at least one) *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    "Technology",
                    "Business",
                    "Arts & Culture",
                    "Food & Cooking",
                    "Sports & Fitness",
                    "Travel",
                    "Music",
                    "Books & Literature",
                    "Entrepreneurship",
                    "Social Impact",
                  ].map((interest) => (
                    <Button
                      key={interest}
                      type="button"
                      variant={interests.includes(interest) ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => toggleInterest(interest)}
                    >
                      {interest}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dietary">Dietary Preferences (optional)</Label>
                <Input
                  id="dietary"
                  value={dietaryPreferences}
                  onChange={(e) => setDietaryPreferences(e.target.value)}
                  placeholder="e.g., Vegetarian, Halal, No restrictions"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            {step < totalSteps ? (
              <Button onClick={handleNext} className="ml-auto">
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isLoading} className="ml-auto">
                {isLoading ? "Submitting..." : "Complete Assessment"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Assessment;
