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
  const [introvertScale, setIntrovertScale] = useState<number | undefined>(undefined);
  const [aloneTimeScale, setAloneTimeScale] = useState<number | undefined>(undefined);
  const [familyScale, setFamilyScale] = useState<number | undefined>(undefined);
  const [spiritualityScale, setSpiritualityScale] = useState<number | undefined>(undefined);
  const [humorScale, setHumorScale] = useState<number | undefined>(undefined);
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
      case 9: return introvertScale !== undefined && introvertScale >= 1 && introvertScale <= 5;
      case 10: return aloneTimeScale !== undefined && aloneTimeScale >= 1 && aloneTimeScale <= 5;
      case 11: return familyScale !== undefined && familyScale >= 1 && familyScale <= 5;
      case 12: return spiritualityScale !== undefined && spiritualityScale >= 1 && spiritualityScale <= 5;
      case 13: return humorScale !== undefined && humorScale >= 1 && humorScale <= 5;
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

  const ScaleSelector = ({ value, onChange, label }: { value: number | undefined; onChange: (val: number) => void; label: string }) => (
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
              <SelectContent className="max-h-[300px]">
                <SelectItem value="afghanistan">Afghanistan</SelectItem>
                <SelectItem value="albania">Albania</SelectItem>
                <SelectItem value="algeria">Algeria</SelectItem>
                <SelectItem value="andorra">Andorra</SelectItem>
                <SelectItem value="angola">Angola</SelectItem>
                <SelectItem value="argentina">Argentina</SelectItem>
                <SelectItem value="armenia">Armenia</SelectItem>
                <SelectItem value="australia">Australia</SelectItem>
                <SelectItem value="austria">Austria</SelectItem>
                <SelectItem value="azerbaijan">Azerbaijan</SelectItem>
                <SelectItem value="bahamas">Bahamas</SelectItem>
                <SelectItem value="bahrain">Bahrain</SelectItem>
                <SelectItem value="bangladesh">Bangladesh</SelectItem>
                <SelectItem value="barbados">Barbados</SelectItem>
                <SelectItem value="belarus">Belarus</SelectItem>
                <SelectItem value="belgium">Belgium</SelectItem>
                <SelectItem value="belize">Belize</SelectItem>
                <SelectItem value="benin">Benin</SelectItem>
                <SelectItem value="bhutan">Bhutan</SelectItem>
                <SelectItem value="bolivia">Bolivia</SelectItem>
                <SelectItem value="bosnia">Bosnia and Herzegovina</SelectItem>
                <SelectItem value="botswana">Botswana</SelectItem>
                <SelectItem value="brazil">Brazil</SelectItem>
                <SelectItem value="brunei">Brunei</SelectItem>
                <SelectItem value="bulgaria">Bulgaria</SelectItem>
                <SelectItem value="burkina_faso">Burkina Faso</SelectItem>
                <SelectItem value="burundi">Burundi</SelectItem>
                <SelectItem value="cambodia">Cambodia</SelectItem>
                <SelectItem value="cameroon">Cameroon</SelectItem>
                <SelectItem value="canada">Canada</SelectItem>
                <SelectItem value="cape_verde">Cape Verde</SelectItem>
                <SelectItem value="central_african_republic">Central African Republic</SelectItem>
                <SelectItem value="chad">Chad</SelectItem>
                <SelectItem value="chile">Chile</SelectItem>
                <SelectItem value="china">China</SelectItem>
                <SelectItem value="colombia">Colombia</SelectItem>
                <SelectItem value="comoros">Comoros</SelectItem>
                <SelectItem value="congo">Congo</SelectItem>
                <SelectItem value="costa_rica">Costa Rica</SelectItem>
                <SelectItem value="croatia">Croatia</SelectItem>
                <SelectItem value="cuba">Cuba</SelectItem>
                <SelectItem value="cyprus">Cyprus</SelectItem>
                <SelectItem value="czech_republic">Czech Republic</SelectItem>
                <SelectItem value="denmark">Denmark</SelectItem>
                <SelectItem value="djibouti">Djibouti</SelectItem>
                <SelectItem value="dominica">Dominica</SelectItem>
                <SelectItem value="dominican_republic">Dominican Republic</SelectItem>
                <SelectItem value="ecuador">Ecuador</SelectItem>
                <SelectItem value="egypt">Egypt</SelectItem>
                <SelectItem value="el_salvador">El Salvador</SelectItem>
                <SelectItem value="equatorial_guinea">Equatorial Guinea</SelectItem>
                <SelectItem value="eritrea">Eritrea</SelectItem>
                <SelectItem value="estonia">Estonia</SelectItem>
                <SelectItem value="ethiopia">Ethiopia</SelectItem>
                <SelectItem value="fiji">Fiji</SelectItem>
                <SelectItem value="finland">Finland</SelectItem>
                <SelectItem value="france">France</SelectItem>
                <SelectItem value="gabon">Gabon</SelectItem>
                <SelectItem value="gambia">Gambia</SelectItem>
                <SelectItem value="georgia">Georgia</SelectItem>
                <SelectItem value="germany">Germany</SelectItem>
                <SelectItem value="ghana">Ghana</SelectItem>
                <SelectItem value="greece">Greece</SelectItem>
                <SelectItem value="grenada">Grenada</SelectItem>
                <SelectItem value="guatemala">Guatemala</SelectItem>
                <SelectItem value="guinea">Guinea</SelectItem>
                <SelectItem value="guinea_bissau">Guinea-Bissau</SelectItem>
                <SelectItem value="guyana">Guyana</SelectItem>
                <SelectItem value="haiti">Haiti</SelectItem>
                <SelectItem value="honduras">Honduras</SelectItem>
                <SelectItem value="hungary">Hungary</SelectItem>
                <SelectItem value="iceland">Iceland</SelectItem>
                <SelectItem value="india">India</SelectItem>
                <SelectItem value="indonesia">Indonesia</SelectItem>
                <SelectItem value="iran">Iran</SelectItem>
                <SelectItem value="iraq">Iraq</SelectItem>
                <SelectItem value="ireland">Ireland</SelectItem>
                <SelectItem value="israel">Israel</SelectItem>
                <SelectItem value="italy">Italy</SelectItem>
                <SelectItem value="jamaica">Jamaica</SelectItem>
                <SelectItem value="japan">Japan</SelectItem>
                <SelectItem value="jordan">Jordan</SelectItem>
                <SelectItem value="kazakhstan">Kazakhstan</SelectItem>
                <SelectItem value="kenya">Kenya</SelectItem>
                <SelectItem value="kiribati">Kiribati</SelectItem>
                <SelectItem value="korea_north">Korea, North</SelectItem>
                <SelectItem value="korea_south">Korea, South</SelectItem>
                <SelectItem value="kosovo">Kosovo</SelectItem>
                <SelectItem value="kuwait">Kuwait</SelectItem>
                <SelectItem value="kyrgyzstan">Kyrgyzstan</SelectItem>
                <SelectItem value="laos">Laos</SelectItem>
                <SelectItem value="latvia">Latvia</SelectItem>
                <SelectItem value="lebanon">Lebanon</SelectItem>
                <SelectItem value="lesotho">Lesotho</SelectItem>
                <SelectItem value="liberia">Liberia</SelectItem>
                <SelectItem value="libya">Libya</SelectItem>
                <SelectItem value="liechtenstein">Liechtenstein</SelectItem>
                <SelectItem value="lithuania">Lithuania</SelectItem>
                <SelectItem value="luxembourg">Luxembourg</SelectItem>
                <SelectItem value="madagascar">Madagascar</SelectItem>
                <SelectItem value="malawi">Malawi</SelectItem>
                <SelectItem value="malaysia">Malaysia</SelectItem>
                <SelectItem value="maldives">Maldives</SelectItem>
                <SelectItem value="mali">Mali</SelectItem>
                <SelectItem value="malta">Malta</SelectItem>
                <SelectItem value="marshall_islands">Marshall Islands</SelectItem>
                <SelectItem value="mauritania">Mauritania</SelectItem>
                <SelectItem value="mauritius">Mauritius</SelectItem>
                <SelectItem value="mexico">Mexico</SelectItem>
                <SelectItem value="micronesia">Micronesia</SelectItem>
                <SelectItem value="moldova">Moldova</SelectItem>
                <SelectItem value="monaco">Monaco</SelectItem>
                <SelectItem value="mongolia">Mongolia</SelectItem>
                <SelectItem value="montenegro">Montenegro</SelectItem>
                <SelectItem value="morocco">Morocco</SelectItem>
                <SelectItem value="mozambique">Mozambique</SelectItem>
                <SelectItem value="myanmar">Myanmar</SelectItem>
                <SelectItem value="namibia">Namibia</SelectItem>
                <SelectItem value="nauru">Nauru</SelectItem>
                <SelectItem value="nepal">Nepal</SelectItem>
                <SelectItem value="netherlands">Netherlands</SelectItem>
                <SelectItem value="new_zealand">New Zealand</SelectItem>
                <SelectItem value="nicaragua">Nicaragua</SelectItem>
                <SelectItem value="niger">Niger</SelectItem>
                <SelectItem value="nigeria">Nigeria</SelectItem>
                <SelectItem value="north_macedonia">North Macedonia</SelectItem>
                <SelectItem value="norway">Norway</SelectItem>
                <SelectItem value="oman">Oman</SelectItem>
                <SelectItem value="pakistan">Pakistan</SelectItem>
                <SelectItem value="palau">Palau</SelectItem>
                <SelectItem value="palestine">Palestine</SelectItem>
                <SelectItem value="panama">Panama</SelectItem>
                <SelectItem value="papua_new_guinea">Papua New Guinea</SelectItem>
                <SelectItem value="paraguay">Paraguay</SelectItem>
                <SelectItem value="peru">Peru</SelectItem>
                <SelectItem value="philippines">Philippines</SelectItem>
                <SelectItem value="poland">Poland</SelectItem>
                <SelectItem value="portugal">Portugal</SelectItem>
                <SelectItem value="qatar">Qatar</SelectItem>
                <SelectItem value="romania">Romania</SelectItem>
                <SelectItem value="russia">Russia</SelectItem>
                <SelectItem value="rwanda">Rwanda</SelectItem>
                <SelectItem value="saint_kitts">Saint Kitts and Nevis</SelectItem>
                <SelectItem value="saint_lucia">Saint Lucia</SelectItem>
                <SelectItem value="saint_vincent">Saint Vincent and the Grenadines</SelectItem>
                <SelectItem value="samoa">Samoa</SelectItem>
                <SelectItem value="san_marino">San Marino</SelectItem>
                <SelectItem value="sao_tome">Sao Tome and Principe</SelectItem>
                <SelectItem value="saudi_arabia">Saudi Arabia</SelectItem>
                <SelectItem value="senegal">Senegal</SelectItem>
                <SelectItem value="serbia">Serbia</SelectItem>
                <SelectItem value="seychelles">Seychelles</SelectItem>
                <SelectItem value="sierra_leone">Sierra Leone</SelectItem>
                <SelectItem value="singapore">Singapore</SelectItem>
                <SelectItem value="slovakia">Slovakia</SelectItem>
                <SelectItem value="slovenia">Slovenia</SelectItem>
                <SelectItem value="solomon_islands">Solomon Islands</SelectItem>
                <SelectItem value="somalia">Somalia</SelectItem>
                <SelectItem value="south_africa">South Africa</SelectItem>
                <SelectItem value="south_sudan">South Sudan</SelectItem>
                <SelectItem value="spain">Spain</SelectItem>
                <SelectItem value="sri_lanka">Sri Lanka</SelectItem>
                <SelectItem value="sudan">Sudan</SelectItem>
                <SelectItem value="suriname">Suriname</SelectItem>
                <SelectItem value="sweden">Sweden</SelectItem>
                <SelectItem value="switzerland">Switzerland</SelectItem>
                <SelectItem value="syria">Syria</SelectItem>
                <SelectItem value="taiwan">Taiwan</SelectItem>
                <SelectItem value="tajikistan">Tajikistan</SelectItem>
                <SelectItem value="tanzania">Tanzania</SelectItem>
                <SelectItem value="thailand">Thailand</SelectItem>
                <SelectItem value="timor_leste">Timor-Leste</SelectItem>
                <SelectItem value="togo">Togo</SelectItem>
                <SelectItem value="tonga">Tonga</SelectItem>
                <SelectItem value="trinidad_tobago">Trinidad and Tobago</SelectItem>
                <SelectItem value="tunisia">Tunisia</SelectItem>
                <SelectItem value="turkey">Turkey</SelectItem>
                <SelectItem value="turkmenistan">Turkmenistan</SelectItem>
                <SelectItem value="tuvalu">Tuvalu</SelectItem>
                <SelectItem value="uganda">Uganda</SelectItem>
                <SelectItem value="ukraine">Ukraine</SelectItem>
                <SelectItem value="united_arab_emirates">United Arab Emirates</SelectItem>
                <SelectItem value="united_kingdom">United Kingdom</SelectItem>
                <SelectItem value="united_states">United States</SelectItem>
                <SelectItem value="uruguay">Uruguay</SelectItem>
                <SelectItem value="uzbekistan">Uzbekistan</SelectItem>
                <SelectItem value="vanuatu">Vanuatu</SelectItem>
                <SelectItem value="vatican_city">Vatican City</SelectItem>
                <SelectItem value="venezuela">Venezuela</SelectItem>
                <SelectItem value="vietnam">Vietnam</SelectItem>
                <SelectItem value="yemen">Yemen</SelectItem>
                <SelectItem value="zambia">Zambia</SelectItem>
                <SelectItem value="zimbabwe">Zimbabwe</SelectItem>
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
