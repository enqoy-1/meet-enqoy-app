import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 23;

const Assessment = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Form state
  const [countryCode, setCountryCode] = useState("+251");
  const [phone, setPhone] = useState("");
  const [phoneVerify, setPhoneVerify] = useState("");
  const [city, setCity] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [dinnerVibe, setDinnerVibe] = useState("");
  const [talkTopic, setTalkTopic] = useState("");
  const [groupDynamic, setGroupDynamic] = useState("");
  const [humorType, setHumorType] = useState("");
  const [wardrobeStyle, setWardrobeStyle] = useState("");
  const [introvertScale, setIntrovertScale] = useState(3);
  const [aloneTimeScale, setAloneTimeScale] = useState(3);
  const [familyScale, setFamilyScale] = useState(3);
  const [spiritualityScale, setSpiritualityScale] = useState(3);
  const [humorScale, setHumorScale] = useState(3);
  const [meetingPriority, setMeetingPriority] = useState("");
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [customDietary, setCustomDietary] = useState("");
  const [restaurantFrequency, setRestaurantFrequency] = useState("");
  const [spending, setSpending] = useState("");
  const [gender, setGender] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [hasChildren, setHasChildren] = useState("");
  const [country, setCountry] = useState("");
  const [birthday, setBirthday] = useState<Date>();
  const [nickName, setNickName] = useState("");
  const [neverGuess, setNeverGuess] = useState("");
  const [funFact, setFunFact] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("assessment_completed")
      .eq("id", user.id)
      .single();

    if (profile?.assessment_completed) {
      navigate("/dashboard");
    }
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!phone || !phoneVerify) return false;
        if (phone !== phoneVerify) {
          toast.error("Phone numbers do not match");
          return false;
        }
        return true;
      case 2: return !!city;
      case 3: return !!preferredTime;
      case 4: return !!dinnerVibe;
      case 5: return !!talkTopic;
      case 6: return !!groupDynamic;
      case 7: return !!humorType;
      case 8: return !!wardrobeStyle;
      case 9: return introvertScale >= 1 && introvertScale <= 5;
      case 10: return aloneTimeScale >= 1 && aloneTimeScale <= 5;
      case 11: return familyScale >= 1 && familyScale <= 5;
      case 12: return spiritualityScale >= 1 && spiritualityScale <= 5;
      case 13: return humorScale >= 1 && humorScale <= 5;
      case 14: return !!meetingPriority;
      case 15: return !!dietaryPreferences && (dietaryPreferences !== "other" || !!customDietary);
      case 16: return !!restaurantFrequency;
      case 17: return !!spending;
      case 18: return !!gender;
      case 19: return !!relationshipStatus;
      case 20: return !!hasChildren;
      case 21: return !!country;
      case 22: return !!birthday;
      case 23: return !!nickName && !!neverGuess && !!funFact;
      default: return false;
    }
  };

  const handleNext = () => {
    if (!validateStep()) {
      toast.error("Please answer the question before continuing");
      return;
    }
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) {
      toast.error("Please complete all required fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const answers = {
        phone: `${countryCode}${phone}`,
        city,
        preferredTime,
        dinnerVibe,
        talkTopic,
        groupDynamic,
        humorType,
        wardrobeStyle,
        introvertScale,
        aloneTimeScale,
        familyScale,
        spiritualityScale,
        humorScale,
        meetingPriority,
        dietaryPreferences,
        customDietary,
        restaurantFrequency,
        spending,
        gender,
        relationshipStatus,
        hasChildren,
        country,
        birthday: birthday?.toISOString(),
        nickName,
        neverGuess,
        funFact,
      };

      await supabase.from("personality_assessments").insert({
        user_id: user.id,
        answers,
      });

      const age = birthday ? new Date().getFullYear() - birthday.getFullYear() : null;

      await supabase
        .from("profiles")
        .update({
          assessment_completed: true,
          phone: `${countryCode}${phone}`,
          gender: gender as any,
          age,
        })
        .eq("id", user.id);

      toast.success("Assessment completed successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error submitting assessment:", error);
      toast.error("Failed to submit assessment");
    } finally {
      setLoading(false);
    }
  };

  const ScaleSelector = ({ value, onChange, label }: { value: number; onChange: (val: number) => void; label: string }) => (
    <div className="space-y-4">
      <Label className="text-base">{label}</Label>
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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+251">🇪🇹 +251</SelectItem>
                    <SelectItem value="+1">🇺🇸 +1</SelectItem>
                    <SelectItem value="+44">🇬🇧 +44</SelectItem>
                    <SelectItem value="+254">🇰🇪 +254</SelectItem>
                    <SelectItem value="+234">🇳🇬 +234</SelectItem>
                    <SelectItem value="+27">🇿🇦 +27</SelectItem>
                    <SelectItem value="+91">🇮🇳 +91</SelectItem>
                    <SelectItem value="+86">🇨🇳 +86</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder=""
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneVerify">Re-enter Phone Number *</Label>
              <div className="flex gap-2">
                <div className="w-[120px] flex items-center justify-center border rounded-md bg-muted px-3 py-2 text-sm">
                  {countryCode}
                </div>
                <Input
                  id="phoneVerify"
                  type="tel"
                  value={phoneVerify}
                  onChange={(e) => setPhoneVerify(e.target.value.replace(/\D/g, ''))}
                  placeholder=""
                  className="flex-1"
                />
              </div>
              {phone && phoneVerify && phone !== phoneVerify && (
                <p className="text-sm text-destructive">Phone numbers do not match</p>
              )}
              {phone && phoneVerify && phone === phoneVerify && (
                <p className="text-sm text-green-600">✓ Phone numbers match</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Label className="text-base">Which city would you like to attend Enqoy from?</Label>
            <RadioGroup value={city} onValueChange={setCity}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="addis" id="addis" />
                <Label htmlFor="addis">Addis Ababa</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="outside" id="outside" />
                <Label htmlFor="outside">Outside Addis Ababa</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Label className="text-base">Would you prefer to attend an Enqoy experience during lunch or dinner?</Label>
            <p className="text-sm text-muted-foreground">
              Dinners take place on Thursdays for a relaxed evening vibe, and lunches take place on Saturdays for a casual midday gathering. Let us know your preference! 😊
            </p>
            <RadioGroup value={preferredTime} onValueChange={setPreferredTime}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dinner" id="dinner" />
                <Label htmlFor="dinner">Dinner (7pm - 9pm)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lunch" id="lunch" />
                <Label htmlFor="lunch">Lunch (2pm - 4pm)</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Section 1: Your Personality</h3>
              <p className="text-sm text-muted-foreground">Let's get to know you. Who are you in a group, and what makes you, well...you?</p>
            </div>
            <Label className="text-base">Which statement best describes your vibe at dinner?</Label>
            <RadioGroup value={dinnerVibe} onValueChange={setDinnerVibe}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="steering" id="steering" />
                <Label htmlFor="steering">I love steering the conversation and asking questions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sharing" id="sharing" />
                <Label htmlFor="sharing">I enjoy sharing stories and experiences</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="observing" id="observing" />
                <Label htmlFor="observing">I prefer to quietly observe and listen</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="adapting" id="adapting" />
                <Label htmlFor="adapting">I adapt to whatever the group needs</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <Label className="text-base">If you could talk about one topic all night, what would it be?</Label>
            <RadioGroup value={talkTopic} onValueChange={setTalkTopic}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="current_events" id="current_events" />
                <Label htmlFor="current_events">Current events and world issues</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="arts" id="arts" />
                <Label htmlFor="arts">Arts, entertainment, and pop culture</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="personal_growth" id="personal_growth" />
                <Label htmlFor="personal_growth">Personal growth and philosophy</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="experiences" id="experiences" />
                <Label htmlFor="experiences">Food, travel, and experiences</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hobbies" id="hobbies" />
                <Label htmlFor="hobbies">Hobbies and niche interests</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <Label className="text-base">What does your ideal group dynamic look like?</Label>
            <RadioGroup value={groupDynamic} onValueChange={setGroupDynamic}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="similar" id="similar" />
                <Label htmlFor="similar">A mix of people with shared interests and similar personalities</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="diverse" id="diverse" />
                <Label htmlFor="diverse">A diverse group with different viewpoints and experiences</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <Label className="text-base">What kind of humor do you enjoy?</Label>
            <RadioGroup value={humorType} onValueChange={setHumorType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sarcastic" id="sarcastic" />
                <Label htmlFor="sarcastic">Sarcastic humor</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="playful" id="playful" />
                <Label htmlFor="playful">Playful and lighthearted jokes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="witty" id="witty" />
                <Label htmlFor="witty">Clever and witty banter</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none">I'm not a big fan of humor at the table</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <Label className="text-base">If your personality were a wardrobe, would it be filled with</Label>
            <RadioGroup value={wardrobeStyle} onValueChange={setWardrobeStyle}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="classics" id="classics" />
                <Label htmlFor="classics">Timeless classics that never go out of style</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="trendy" id="trendy" />
                <Label htmlFor="trendy">Bold, trendy pieces that make a statement</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 9:
        return <ScaleSelector value={introvertScale} onChange={setIntrovertScale} label="I am an introverted person" />;

      case 10:
        return <ScaleSelector value={aloneTimeScale} onChange={setAloneTimeScale} label="I enjoy spending time alone to recharge and reflect" />;

      case 11:
        return <ScaleSelector value={familyScale} onChange={setFamilyScale} label="How important is staying close to family and loved ones?" />;

      case 12:
        return <ScaleSelector value={spiritualityScale} onChange={setSpiritualityScale} label="How important is having a sense of spirituality or deeper meaning in life?" />;

      case 13:
        return <ScaleSelector value={humorScale} onChange={setHumorScale} label="How important is sharing laughter and enjoying humor with others?" />;

      case 14:
        return (
          <div className="space-y-4">
            <Label className="text-base">What's most important to you when meeting new people?</Label>
            <RadioGroup value={meetingPriority} onValueChange={setMeetingPriority}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="shared_values" id="shared_values" />
                <Label htmlFor="shared_values">Shared values and interests</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="engaging" id="engaging" />
                <Label htmlFor="engaging">Fun and engaging conversations</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="learning" id="learning" />
                <Label htmlFor="learning">Learning something new from others</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="connection" id="connection" />
                <Label htmlFor="connection">Feeling a sense of connection</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 15:
        return (
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Section 2: Your Preferences</h3>
              <p className="text-sm text-muted-foreground">Let's talk about what makes your dinner experience perfect—from food to vibes.</p>
            </div>
            <Label className="text-base">Do you have any dietary preferences or restrictions?</Label>
            <RadioGroup value={dietaryPreferences} onValueChange={setDietaryPreferences}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none_diet" />
                <Label htmlFor="none_diet">None</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fasting" id="fasting" />
                <Label htmlFor="fasting">Fasting</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vegan" id="vegan" />
                <Label htmlFor="vegan">Vegan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gluten_free" id="gluten_free" />
                <Label htmlFor="gluten_free">Gluten-free</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other_diet" />
                <Label htmlFor="other_diet">Other</Label>
              </div>
            </RadioGroup>
            {dietaryPreferences === "other" && (
              <div className="space-y-2 mt-4">
                <Label htmlFor="customDietary">Please specify</Label>
                <Input
                  id="customDietary"
                  value={customDietary}
                  onChange={(e) => setCustomDietary(e.target.value)}
                  placeholder="Enter your dietary restrictions"
                />
              </div>
            )}
          </div>
        );

      case 16:
        return (
          <div className="space-y-4">
            <Label className="text-base">How often do you go out to restaurants every month?</Label>
            <RadioGroup value={restaurantFrequency} onValueChange={setRestaurantFrequency}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1-2" id="1-2" />
                <Label htmlFor="1-2">1-2 times</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3-5" id="3-5" />
                <Label htmlFor="3-5">3-5 times</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="6+" id="6+" />
                <Label htmlFor="6+">6+ times</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 17:
        return (
          <div className="space-y-4">
            <Label className="text-base">How much do you usually spend on yourself when out with friends?</Label>
            <RadioGroup value={spending} onValueChange={setSpending}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="500-1000" id="500-1000" />
                <Label htmlFor="500-1000">500 - 1000 ETB</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1000-1500" id="1000-1500" />
                <Label htmlFor="1000-1500">1000 - 1500 ETB</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1500+" id="1500+" />
                <Label htmlFor="1500+">More than 1500 ETB</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 18:
        return (
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Section 3: Personal Details</h3>
              <p className="text-sm text-muted-foreground">You're almost done! Next, tell us a little about yourself! These details help us personalize your experience.</p>
            </div>
            <Label className="text-base">Gender</Label>
            <RadioGroup value={gender} onValueChange={setGender}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male">Male</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female">Female</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 19:
        return (
          <div className="space-y-4">
            <Label className="text-base">What is your relationship status?</Label>
            <RadioGroup value={relationshipStatus} onValueChange={setRelationshipStatus}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single">Single</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="married" id="married" />
                <Label htmlFor="married">Married</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="relationship" id="relationship" />
                <Label htmlFor="relationship">In a relationship</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="complicated" id="complicated" />
                <Label htmlFor="complicated">It's complicated</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 20:
        return (
          <div className="space-y-4">
            <Label className="text-base">Do you have children?</Label>
            <RadioGroup value={hasChildren} onValueChange={setHasChildren}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="yes" />
                <Label htmlFor="yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no">No</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="prefer_not_say" id="prefer_not_say" />
                <Label htmlFor="prefer_not_say">Prefer not to say</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 21:
        return (
          <div className="space-y-4">
            <Label htmlFor="country" className="text-base">What country are you from?</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                <SelectItem value="ethiopia">Ethiopia</SelectItem>
                <SelectItem value="usa">United States</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="canada">Canada</SelectItem>
                <SelectItem value="kenya">Kenya</SelectItem>
                <SelectItem value="nigeria">Nigeria</SelectItem>
                <SelectItem value="south_africa">South Africa</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 22:
        return (
          <div className="space-y-4">
            <Label className="text-base">When is your birthday?</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !birthday && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {birthday ? format(birthday, "PPP") : <span>Pick your birthday</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={birthday}
                  onSelect={setBirthday}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      case 23:
        return (
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Section 4: Icebreakers</h3>
              <p className="text-sm text-muted-foreground">Finally, let's sprinkle in some fun. Here's where we get a little playful!</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickName" className="text-base">What name would you like to go by?</Label>
              <Input
                id="nickName"
                value={nickName}
                onChange={(e) => setNickName(e.target.value)}
                placeholder="Enter your preferred name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="neverGuess" className="text-base">What's one thing people would never guess about you?</Label>
              <Textarea
                id="neverGuess"
                value={neverGuess}
                onChange={(e) => setNeverGuess(e.target.value)}
                placeholder="Share something surprising..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="funFact" className="text-base">Share a fun fact about yourself.</Label>
              <Textarea
                id="funFact"
                value={funFact}
                onChange={(e) => setFunFact(e.target.value)}
                placeholder="Tell us something fun..."
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Assessment</CardTitle>
          <CardDescription>
            Question {step} of {TOTAL_STEPS}
          </CardDescription>
          <Progress value={(step / TOTAL_STEPS) * 100} className="mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStep()}
          
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
            >
              Back
            </Button>
            
            {step < TOTAL_STEPS ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={loading}>
                {loading ? "Submitting..." : "Complete Assessment"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Assessment;
