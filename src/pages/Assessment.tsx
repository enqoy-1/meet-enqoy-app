import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { assessmentsApi, usersApi, outsideCityInterestsApi } from "@/api";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
// Import from QuestionRenderer to use shared types
import { QuestionRenderer, AssessmentQuestion } from "@/components/assessment/QuestionRenderer";

const TOTAL_STEPS = 22;

const Assessment = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const isRetake = searchParams.get("retake") === "true";

  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadingSavedProgress, setLoadingSavedProgress] = useState(true);
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [step, setStep] = useState(1);
  const [dynamicQuestions, setDynamicQuestions] = useState<AssessmentQuestion[]>([]);
  const [autoSaving, setAutoSaving] = useState(false);

  // Form state
  const [countryCode, setCountryCode] = useState("+251");
  const [phone, setPhone] = useState("");
  const [phoneVerify, setPhoneVerify] = useState("");
  const [city, setCity] = useState("");
  const [specifiedCity, setSpecifiedCity] = useState("");
  const [showOutsideCityMessage, setShowOutsideCityMessage] = useState(false);
  const [showUnderageMessage, setShowUnderageMessage] = useState(false);
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
  const [countryOpen, setCountryOpen] = useState(false);
  const [birthday, setBirthday] = useState<Date>();
  const [nickName, setNickName] = useState("");


  const countries = [
    { value: "afghanistan", label: "Afghanistan" },
    { value: "albania", label: "Albania" },
    { value: "algeria", label: "Algeria" },
    { value: "andorra", label: "Andorra" },
    { value: "angola", label: "Angola" },
    { value: "argentina", label: "Argentina" },
    { value: "armenia", label: "Armenia" },
    { value: "australia", label: "Australia" },
    { value: "austria", label: "Austria" },
    { value: "azerbaijan", label: "Azerbaijan" },
    { value: "bahamas", label: "Bahamas" },
    { value: "bahrain", label: "Bahrain" },
    { value: "bangladesh", label: "Bangladesh" },
    { value: "barbados", label: "Barbados" },
    { value: "belarus", label: "Belarus" },
    { value: "belgium", label: "Belgium" },
    { value: "belize", label: "Belize" },
    { value: "benin", label: "Benin" },
    { value: "bhutan", label: "Bhutan" },
    { value: "bolivia", label: "Bolivia" },
    { value: "bosnia", label: "Bosnia and Herzegovina" },
    { value: "botswana", label: "Botswana" },
    { value: "brazil", label: "Brazil" },
    { value: "brunei", label: "Brunei" },
    { value: "bulgaria", label: "Bulgaria" },
    { value: "burkina_faso", label: "Burkina Faso" },
    { value: "burundi", label: "Burundi" },
    { value: "cambodia", label: "Cambodia" },
    { value: "cameroon", label: "Cameroon" },
    { value: "canada", label: "Canada" },
    { value: "cape_verde", label: "Cape Verde" },
    { value: "central_african_republic", label: "Central African Republic" },
    { value: "chad", label: "Chad" },
    { value: "chile", label: "Chile" },
    { value: "china", label: "China" },
    { value: "colombia", label: "Colombia" },
    { value: "comoros", label: "Comoros" },
    { value: "congo", label: "Congo" },
    { value: "costa_rica", label: "Costa Rica" },
    { value: "croatia", label: "Croatia" },
    { value: "cuba", label: "Cuba" },
    { value: "cyprus", label: "Cyprus" },
    { value: "czech_republic", label: "Czech Republic" },
    { value: "denmark", label: "Denmark" },
    { value: "djibouti", label: "Djibouti" },
    { value: "dominica", label: "Dominica" },
    { value: "dominican_republic", label: "Dominican Republic" },
    { value: "ecuador", label: "Ecuador" },
    { value: "egypt", label: "Egypt" },
    { value: "el_salvador", label: "El Salvador" },
    { value: "equatorial_guinea", label: "Equatorial Guinea" },
    { value: "eritrea", label: "Eritrea" },
    { value: "estonia", label: "Estonia" },
    { value: "ethiopia", label: "Ethiopia" },
    { value: "fiji", label: "Fiji" },
    { value: "finland", label: "Finland" },
    { value: "france", label: "France" },
    { value: "gabon", label: "Gabon" },
    { value: "gambia", label: "Gambia" },
    { value: "georgia", label: "Georgia" },
    { value: "germany", label: "Germany" },
    { value: "ghana", label: "Ghana" },
    { value: "greece", label: "Greece" },
    { value: "grenada", label: "Grenada" },
    { value: "guatemala", label: "Guatemala" },
    { value: "guinea", label: "Guinea" },
    { value: "guinea_bissau", label: "Guinea-Bissau" },
    { value: "guyana", label: "Guyana" },
    { value: "haiti", label: "Haiti" },
    { value: "honduras", label: "Honduras" },
    { value: "hungary", label: "Hungary" },
    { value: "iceland", label: "Iceland" },
    { value: "india", label: "India" },
    { value: "indonesia", label: "Indonesia" },
    { value: "iran", label: "Iran" },
    { value: "iraq", label: "Iraq" },
    { value: "ireland", label: "Ireland" },
    { value: "israel", label: "Israel" },
    { value: "italy", label: "Italy" },
    { value: "jamaica", label: "Jamaica" },
    { value: "japan", label: "Japan" },
    { value: "jordan", label: "Jordan" },
    { value: "kazakhstan", label: "Kazakhstan" },
    { value: "kenya", label: "Kenya" },
    { value: "kiribati", label: "Kiribati" },
    { value: "korea_north", label: "Korea, North" },
    { value: "korea_south", label: "Korea, South" },
    { value: "kosovo", label: "Kosovo" },
    { value: "kuwait", label: "Kuwait" },
    { value: "kyrgyzstan", label: "Kyrgyzstan" },
    { value: "laos", label: "Laos" },
    { value: "latvia", label: "Latvia" },
    { value: "lebanon", label: "Lebanon" },
    { value: "lesotho", label: "Lesotho" },
    { value: "liberia", label: "Liberia" },
    { value: "libya", label: "Libya" },
    { value: "liechtenstein", label: "Liechtenstein" },
    { value: "lithuania", label: "Lithuania" },
    { value: "luxembourg", label: "Luxembourg" },
    { value: "madagascar", label: "Madagascar" },
    { value: "malawi", label: "Malawi" },
    { value: "malaysia", label: "Malaysia" },
    { value: "maldives", label: "Maldives" },
    { value: "mali", label: "Mali" },
    { value: "malta", label: "Malta" },
    { value: "marshall_islands", label: "Marshall Islands" },
    { value: "mauritania", label: "Mauritania" },
    { value: "mauritius", label: "Mauritius" },
    { value: "mexico", label: "Mexico" },
    { value: "micronesia", label: "Micronesia" },
    { value: "moldova", label: "Moldova" },
    { value: "monaco", label: "Monaco" },
    { value: "mongolia", label: "Mongolia" },
    { value: "montenegro", label: "Montenegro" },
    { value: "morocco", label: "Morocco" },
    { value: "mozambique", label: "Mozambique" },
    { value: "myanmar", label: "Myanmar" },
    { value: "namibia", label: "Namibia" },
    { value: "nauru", label: "Nauru" },
    { value: "nepal", label: "Nepal" },
    { value: "netherlands", label: "Netherlands" },
    { value: "new_zealand", label: "New Zealand" },
    { value: "nicaragua", label: "Nicaragua" },
    { value: "niger", label: "Niger" },
    { value: "nigeria", label: "Nigeria" },
    { value: "north_macedonia", label: "North Macedonia" },
    { value: "norway", label: "Norway" },
    { value: "oman", label: "Oman" },
    { value: "pakistan", label: "Pakistan" },
    { value: "palau", label: "Palau" },
    { value: "palestine", label: "Palestine" },
    { value: "panama", label: "Panama" },
    { value: "papua_new_guinea", label: "Papua New Guinea" },
    { value: "paraguay", label: "Paraguay" },
    { value: "peru", label: "Peru" },
    { value: "philippines", label: "Philippines" },
    { value: "poland", label: "Poland" },
    { value: "portugal", label: "Portugal" },
    { value: "qatar", label: "Qatar" },
    { value: "romania", label: "Romania" },
    { value: "russia", label: "Russia" },
    { value: "rwanda", label: "Rwanda" },
    { value: "saint_kitts", label: "Saint Kitts and Nevis" },
    { value: "saint_lucia", label: "Saint Lucia" },
    { value: "saint_vincent", label: "Saint Vincent and the Grenadines" },
    { value: "samoa", label: "Samoa" },
    { value: "san_marino", label: "San Marino" },
    { value: "sao_tome", label: "Sao Tome and Principe" },
    { value: "saudi_arabia", label: "Saudi Arabia" },
    { value: "senegal", label: "Senegal" },
    { value: "serbia", label: "Serbia" },
    { value: "seychelles", label: "Seychelles" },
    { value: "sierra_leone", label: "Sierra Leone" },
    { value: "singapore", label: "Singapore" },
    { value: "slovakia", label: "Slovakia" },
    { value: "slovenia", label: "Slovenia" },
    { value: "solomon_islands", label: "Solomon Islands" },
    { value: "somalia", label: "Somalia" },
    { value: "south_africa", label: "South Africa" },
    { value: "south_sudan", label: "South Sudan" },
    { value: "spain", label: "Spain" },
    { value: "sri_lanka", label: "Sri Lanka" },
    { value: "sudan", label: "Sudan" },
    { value: "suriname", label: "Suriname" },
    { value: "sweden", label: "Sweden" },
    { value: "switzerland", label: "Switzerland" },
    { value: "syria", label: "Syria" },
    { value: "taiwan", label: "Taiwan" },
    { value: "tajikistan", label: "Tajikistan" },
    { value: "tanzania", label: "Tanzania" },
    { value: "thailand", label: "Thailand" },
    { value: "timor_leste", label: "Timor-Leste" },
    { value: "togo", label: "Togo" },
    { value: "tonga", label: "Tonga" },
    { value: "trinidad_tobago", label: "Trinidad and Tobago" },
    { value: "tunisia", label: "Tunisia" },
    { value: "turkey", label: "Turkey" },
    { value: "turkmenistan", label: "Turkmenistan" },
    { value: "tuvalu", label: "Tuvalu" },
    { value: "uganda", label: "Uganda" },
    { value: "ukraine", label: "Ukraine" },
    { value: "united_arab_emirates", label: "United Arab Emirates" },
    { value: "united_kingdom", label: "United Kingdom" },
    { value: "united_states", label: "United States" },
    { value: "uruguay", label: "Uruguay" },
    { value: "uzbekistan", label: "Uzbekistan" },
    { value: "vanuatu", label: "Vanuatu" },
    { value: "vatican_city", label: "Vatican City" },
    { value: "venezuela", label: "Venezuela" },
    { value: "vietnam", label: "Vietnam" },
    { value: "yemen", label: "Yemen" },
    { value: "zambia", label: "Zambia" },
    { value: "zimbabwe", label: "Zimbabwe" },
  ];

  useEffect(() => {
    checkAuth();
    loadSavedProgress();

    // Add beforeunload event listener to warn about leaving during assessment
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!showUnderageMessage && !showOutsideCityMessage) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [showUnderageMessage, showOutsideCityMessage]);

  // Set default phone country code based on user's country
  useEffect(() => {
    if (user?.profile?.country?.phoneCode) {
      // Only set if countryCode is still the default (+251) or not matching user's country
      if (countryCode === "+251" || !countryCode.startsWith("+")) {
        setCountryCode(user.profile.country.phoneCode);
      }
    }
  }, [user?.profile?.country?.phoneCode]);

  // Load dynamic questions from the database based on user's country
  useEffect(() => {
    const loadDynamicQuestions = async () => {
      if (!user?.profile?.country?.id) return;

      try {
        setLoadingQuestions(true);
        const questions = await assessmentsApi.getQuestions(user.profile.country.id);
        setDynamicQuestions(questions || []);
      } catch (error) {
        console.error("Failed to load dynamic questions:", error);
      } finally {
        setLoadingQuestions(false);
      }
    };

    loadDynamicQuestions();
  }, [user?.profile?.country?.id]);

  // Auto-save progress whenever form values change
  useEffect(() => {
    // Don't auto-save until we've loaded initial data
    if (loadingSavedProgress) return;

    // Debounce auto-save to avoid too many API calls
    const timeoutId = setTimeout(() => {
      autoSaveProgress();
    }, 2000); // Wait 2 seconds after last change before saving

    return () => clearTimeout(timeoutId);
  }, [
    phone, phoneVerify, city, specifiedCity, preferredTime, dinnerVibe, talkTopic,
    groupDynamic, humorType, wardrobeStyle, introvertScale, aloneTimeScale,
    familyScale, spiritualityScale, humorScale, meetingPriority, dietaryPreferences,
    customDietary, restaurantFrequency, spending, gender, relationshipStatus,
    hasChildren, country, birthday, nickName, loadingSavedProgress
  ]);

  const checkAuth = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (user.profile?.assessmentCompleted && !isRetake) {
      navigate("/dashboard");
    }
  };

  const loadSavedProgress = async () => {
    try {
      const savedAssessment = await assessmentsApi.getMy();
      if (savedAssessment && savedAssessment.answers) {
        const answers = savedAssessment.answers;

        // Restore all form fields from saved progress
        if (answers.phone) {
          const phoneMatch = answers.phone.match(/^(\+\d+)(.+)$/);
          if (phoneMatch) {
            setCountryCode(phoneMatch[1]);
            setPhone(phoneMatch[2]);
            setPhoneVerify(phoneMatch[2]);
          } else {
            // Phone was saved without country code - just load the number
            setPhone(answers.phone);
            setPhoneVerify(answers.phone);
          }
        }
        if (answers.city) setCity(answers.city);
        if (answers.specifiedCity) setSpecifiedCity(answers.specifiedCity);
        if (answers.preferredTime) setPreferredTime(answers.preferredTime);
        if (answers.dinnerVibe) setDinnerVibe(answers.dinnerVibe);
        if (answers.talkTopic) setTalkTopic(answers.talkTopic);
        if (answers.groupDynamic) setGroupDynamic(answers.groupDynamic);
        if (answers.humorType) setHumorType(answers.humorType);
        if (answers.wardrobeStyle) setWardrobeStyle(answers.wardrobeStyle);
        if (answers.introvertScale !== undefined) setIntrovertScale(answers.introvertScale);
        if (answers.aloneTimeScale !== undefined) setAloneTimeScale(answers.aloneTimeScale);
        if (answers.familyScale !== undefined) setFamilyScale(answers.familyScale);
        if (answers.spiritualityScale !== undefined) setSpiritualityScale(answers.spiritualityScale);
        if (answers.humorScale !== undefined) setHumorScale(answers.humorScale);
        if (answers.meetingPriority) setMeetingPriority(answers.meetingPriority);
        if (answers.dietaryPreferences) setDietaryPreferences(answers.dietaryPreferences);
        if (answers.customDietary) setCustomDietary(answers.customDietary);
        if (answers.restaurantFrequency) setRestaurantFrequency(answers.restaurantFrequency);
        if (answers.spending) setSpending(answers.spending);
        if (answers.gender) setGender(answers.gender);
        if (answers.relationshipStatus) setRelationshipStatus(answers.relationshipStatus);
        if (answers.hasChildren) setHasChildren(answers.hasChildren);
        if (answers.country) setCountry(answers.country);
        if (answers.birthday) setBirthday(new Date(answers.birthday));
        if (answers.nickName) setNickName(answers.nickName);


        // Show message that user can continue from where they left off
        if (!savedAssessment.isCompleted) {
          setHasSavedProgress(true);
          toast.success("Resuming where you left off!", { duration: 5000 });
        }
      }
    } catch (error) {
      console.log("No saved progress found");
    } finally {
      setLoadingSavedProgress(false);
    }
  };

  const autoSaveProgress = async () => {
    if (!user || autoSaving) return;

    try {
      setAutoSaving(true);
      const answers = {
        phone: phone ? `${countryCode}${phone}` : undefined,
        city,
        specifiedCity,
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

      };

      await assessmentsApi.saveProgress(answers);
      console.log("Progress saved automatically");
    } catch (error) {
      console.error("Error auto-saving progress:", error);
    } finally {
      setAutoSaving(false);
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
      case 2:
        if (!city) return false;
        if (city === "outside" && !specifiedCity.trim()) {
          toast.error("Please specify your city");
          return false;
        }
        return true;
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
      case 15: {
        // Handle both array (checkbox) and string (radio) values
        const hasValue = Array.isArray(dietaryPreferences)
          ? dietaryPreferences.length > 0
          : !!dietaryPreferences;

        const hasOther = Array.isArray(dietaryPreferences)
          ? dietaryPreferences.some((v: string) => v.toLowerCase().trim() === "other")
          : (typeof dietaryPreferences === 'string' && dietaryPreferences.toLowerCase().trim() === "other");

        // If "other" is selected, custom dietary must be filled
        return hasValue && (!hasOther || !!customDietary);
      }
      case 16: return !!restaurantFrequency;
      case 17: return !!spending;
      case 18: return !!gender;
      case 19: return !!relationshipStatus;
      case 20: return !!hasChildren;
      case 21: return !!country;
      case 22:
        if (!birthday) return false;
        const age = new Date().getFullYear() - birthday.getFullYear();
        const monthDiff = new Date().getMonth() - birthday.getMonth();
        const dayDiff = new Date().getDate() - birthday.getDate();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

        if (actualAge < 18) {
          setShowUnderageMessage(true);
          return false;
        }
        return true;
      case 23: return true; // Optional questions
      default: return false;
    }
  };

  const handleNext = () => {
    if (!validateStep()) {
      toast.error("Please answer the question before continuing");
      return;
    }

    // Special handling for users outside Addis Ababa
    if (step === 2 && city === "outside") {
      saveOutsideCityInterest();
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const saveOutsideCityInterest = async () => {
    try {
      // Save to outside city interests API
      await outsideCityInterestsApi.create(specifiedCity);
      setShowOutsideCityMessage(true);
    } catch (error) {
      console.error("Error saving outside city interest:", error);
      // Still show the message even if save fails
      setShowOutsideCityMessage(true);
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
      if (!user) throw new Error("Not authenticated");

      const answers = {
        phone: `${countryCode}${phone}`,
        city,
        specifiedCity,
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

      };

      await assessmentsApi.submit(answers);

      const age = birthday ? new Date().getFullYear() - birthday.getFullYear() : null;

      // Determine the city to save - use specifiedCity for outside users, otherwise use the main city
      const userMainCity = user?.profile?.country?.mainCity || "Addis Ababa";
      const cityToSave = city === "outside" ? specifiedCity : city === "main" ? userMainCity : city;

      await usersApi.updateProfile({
        assessmentCompleted: true,
        phone: `${countryCode}${phone}`,
        gender: gender,
        age,
        city: cityToSave,
        relationshipStatus,
        hasChildren: hasChildren === "yes",
      });

      toast.success("Assessment completed successfully!");

      // Refresh user data and navigate
      await refreshUser();
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
                    {/* Africa */}
                    <SelectItem value="+251">🇪🇹 +251 Ethiopia</SelectItem>
                    <SelectItem value="+250">🇷🇼 +250 Rwanda</SelectItem>
                    <SelectItem value="+254">🇰🇪 +254 Kenya</SelectItem>
                    <SelectItem value="+255">🇹🇿 +255 Tanzania</SelectItem>
                    <SelectItem value="+256">🇺🇬 +256 Uganda</SelectItem>
                    <SelectItem value="+234">🇳🇬 +234 Nigeria</SelectItem>
                    <SelectItem value="+233">🇬🇭 +233 Ghana</SelectItem>
                    <SelectItem value="+27">🇿🇦 +27 South Africa</SelectItem>
                    <SelectItem value="+20">🇪🇬 +20 Egypt</SelectItem>
                    <SelectItem value="+212">🇲🇦 +212 Morocco</SelectItem>
                    <SelectItem value="+253">🇩🇯 +253 Djibouti</SelectItem>
                    <SelectItem value="+252">🇸🇴 +252 Somalia</SelectItem>
                    <SelectItem value="+249">🇸🇩 +249 Sudan</SelectItem>
                    <SelectItem value="+291">🇪🇷 +291 Eritrea</SelectItem>
                    {/* Middle East */}
                    <SelectItem value="+971">🇦🇪 +971 UAE</SelectItem>
                    <SelectItem value="+966">🇸🇦 +966 Saudi Arabia</SelectItem>
                    <SelectItem value="+974">🇶🇦 +974 Qatar</SelectItem>
                    <SelectItem value="+972">🇮🇱 +972 Israel</SelectItem>
                    <SelectItem value="+90">🇹🇷 +90 Turkey</SelectItem>
                    {/* Europe */}
                    <SelectItem value="+44">🇬🇧 +44 UK</SelectItem>
                    <SelectItem value="+49">🇩🇪 +49 Germany</SelectItem>
                    <SelectItem value="+33">🇫🇷 +33 France</SelectItem>
                    <SelectItem value="+39">🇮🇹 +39 Italy</SelectItem>
                    <SelectItem value="+31">🇳🇱 +31 Netherlands</SelectItem>
                    <SelectItem value="+46">🇸🇪 +46 Sweden</SelectItem>
                    {/* Americas */}
                    <SelectItem value="+1">🇺🇸 +1 USA/Canada</SelectItem>
                    <SelectItem value="+55">🇧🇷 +55 Brazil</SelectItem>
                    {/* Asia */}
                    <SelectItem value="+91">🇮🇳 +91 India</SelectItem>
                    <SelectItem value="+86">🇨🇳 +86 China</SelectItem>
                    <SelectItem value="+81">🇯🇵 +81 Japan</SelectItem>
                    <SelectItem value="+82">🇰🇷 +82 South Korea</SelectItem>
                    <SelectItem value="+65">🇸🇬 +65 Singapore</SelectItem>
                    {/* Oceania */}
                    <SelectItem value="+61">🇦🇺 +61 Australia</SelectItem>
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
        const userMainCity = user?.profile?.country?.mainCity || "Addis Ababa";
        return (
          <div className="space-y-4">
            <Label className="text-base">Which city would you like to attend Enqoy from?</Label>
            <RadioGroup value={city} onValueChange={setCity}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="main" id="main" />
                <Label htmlFor="main">{userMainCity}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="outside" id="outside" />
                <Label htmlFor="outside">Outside {userMainCity}</Label>
              </div>
            </RadioGroup>

            {city === "outside" && (
              <div className="space-y-2 mt-4">
                <Label htmlFor="specifiedCity">If you select outside of {userMainCity}, can you please specify which city? *</Label>
                <Input
                  id="specifiedCity"
                  value={specifiedCity}
                  onChange={(e) => setSpecifiedCity(e.target.value)}
                  placeholder="Enter your city"
                />
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Label className="text-base">Would you prefer to attend an Enqoy experience during lunch or dinner?</Label>
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

      case 15: {
        // Use dynamic dietary preferences question from database
        const dietaryQuestion = dynamicQuestions.find(q => q.key.includes('dietaryPreferences'));

        if (dietaryQuestion) {
          // Check if "other" is selected (case-insensitive to handle admin edits)
          const hasOther = Array.isArray(dietaryPreferences)
            ? dietaryPreferences.some((v: string) => v.toLowerCase().trim() === "other")
            : (typeof dietaryPreferences === 'string' && dietaryPreferences.toLowerCase().trim() === "other");

          return (
            <div className="space-y-4">
              <QuestionRenderer
                question={dietaryQuestion}
                value={dietaryPreferences}
                onChange={setDietaryPreferences}
              />
              {hasOther && (
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
        }

        // Fallback to hardcoded options if dynamic question not found
        return (
          <div className="space-y-4">
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
      }

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
        // Try to get spending question from dynamic questions (database)
        // Look for 'spending' or 'rw_spending' (country-prefixed keys)
        const spendingQuestion = dynamicQuestions.find(q =>
          q.key === 'spending' || q.key.endsWith('_spending')
        );

        // If we have dynamic options from the database, use those
        if (spendingQuestion && spendingQuestion.options && spendingQuestion.options.length > 0) {
          // Normalize options - handle both string arrays and object arrays
          const normalizedOptions = spendingQuestion.options.map((opt: any) => {
            if (typeof opt === 'string') {
              return { value: opt, label: opt };
            }
            return { value: opt.value || '', label: opt.label || opt.value || '' };
          });

          return (
            <div className="space-y-4">
              <Label className="text-base">{spendingQuestion.label}</Label>
              <RadioGroup value={spending} onValueChange={setSpending}>
                {normalizedOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`spending-${option.value}`} />
                    <Label htmlFor={`spending-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          );
        }

        // Fallback to hardcoded options if database question not found
        const countryCode17 = user?.profile?.country?.code;
        const getSpendingOptions = () => {
          if (countryCode17 === 'RW') {
            return {
              options: [
                { value: '5000-10000', label: '5,000 - 10,000 RWF' },
                { value: '10000-20000', label: '10,000 - 20,000 RWF' },
                { value: '20000+', label: 'More than 20,000 RWF' },
              ]
            };
          }
          // Default to Ethiopia (ETB)
          return {
            options: [
              { value: '500-1000', label: '500 - 1,000 ETB' },
              { value: '1000-1500', label: '1,000 - 1,500 ETB' },
              { value: '1500+', label: 'More than 1,500 ETB' },
            ]
          };
        };
        const spendingConfig = getSpendingOptions();

        return (
          <div className="space-y-4">
            <Label className="text-base">How much do you usually spend on yourself when out with friends?</Label>
            <RadioGroup value={spending} onValueChange={setSpending}>
              {spendingConfig.options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`spending-${option.value}`} />
                  <Label htmlFor={option.value}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 18:
        return (
          <div className="space-y-4">
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
            <Label className="text-base">What country are you from?</Label>
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={countryOpen}
                  className="w-full justify-between"
                >
                  {country
                    ? countries.find((c) => c.value === country)?.label
                    : "Select country..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search country..." />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      {countries.map((c) => (
                        <CommandItem
                          key={c.value}
                          value={c.value}
                          onSelect={(currentValue) => {
                            setCountry(currentValue === country ? "" : currentValue);
                            setCountryOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              country === c.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {c.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        );

      case 22:
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);
        const months = [
          { value: 0, label: "January" },
          { value: 1, label: "February" },
          { value: 2, label: "March" },
          { value: 3, label: "April" },
          { value: 4, label: "May" },
          { value: 5, label: "June" },
          { value: 6, label: "July" },
          { value: 7, label: "August" },
          { value: 8, label: "September" },
          { value: 9, label: "October" },
          { value: 10, label: "November" },
          { value: 11, label: "December" },
        ];

        const selectedYear = birthday?.getFullYear();
        const selectedMonth = birthday?.getMonth();
        const selectedDay = birthday?.getDate();

        // Calculate days in month
        const daysInMonth = selectedYear && selectedMonth !== undefined
          ? new Date(selectedYear, selectedMonth + 1, 0).getDate()
          : 31;
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const handleDateChange = (type: 'year' | 'month' | 'day', value: string) => {
          const year = type === 'year' ? parseInt(value) : (selectedYear || currentYear);
          const month = type === 'month' ? parseInt(value) : (selectedMonth ?? 0);
          const day = type === 'day' ? parseInt(value) : (selectedDay || 1);

          // Adjust day if it's invalid for the selected month
          const maxDays = new Date(year, month + 1, 0).getDate();
          const validDay = Math.min(day, maxDays);

          setBirthday(new Date(year, month, validDay));
        };

        return (
          <div className="space-y-4">
            <Label className="text-base">When is your birthday?</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="year" className="text-sm">Year</Label>
                <Select
                  value={selectedYear?.toString()}
                  onValueChange={(value) => handleDateChange('year', value)}
                >
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="month" className="text-sm">Month</Label>
                <Select
                  value={selectedMonth?.toString()}
                  onValueChange={(value) => handleDateChange('month', value)}
                >
                  <SelectTrigger id="month">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="day" className="text-sm">Day</Label>
                <Select
                  value={selectedDay?.toString()}
                  onValueChange={(value) => handleDateChange('day', value)}
                >
                  <SelectTrigger id="day">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {birthday && (
              <p className="text-sm text-muted-foreground text-center">
                Selected: {format(birthday, "PPP")}
              </p>
            )}
          </div>
        );



      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      {loadingQuestions ? (
        <Card className="w-full max-w-2xl">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading assessment questions...</p>
            </div>
          </CardContent>
        </Card>
      ) : showUnderageMessage ? (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Age Requirement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <p className="text-center">
                Thank you for your interest in Enqoy! Unfortunately, you must be at least 18 years old to participate in our events.
              </p>
              <p className="text-center text-muted-foreground">
                This age requirement is in place because:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Our events are held at venues that serve alcohol</li>
                <li>The conversations and activities are designed for adults</li>
                <li>We want to ensure a comfortable environment for all participants</li>
              </ul>
              <p className="text-center font-semibold mt-6">
                We'd love to have you join us when you turn 18! Feel free to come back then.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUnderageMessage(false);
                  setStep(22);
                }}
              >
                Back to birthday question
              </Button>
              <Button onClick={() => navigate("/")}>
                Go back to the main page
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : showOutsideCityMessage ? (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Thank you!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center">
              You submitted the form successfully. Unfortunately, we're not hosting dinners in your city just yet.
              But don't worry—we'll reach out as soon as Enqoy arrives in your area!
            </p>
            <div className="flex justify-center">
              <Button onClick={() => navigate("/")}>
                Go back to the main page
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle>Assessment</CardTitle>
                <CardDescription>
                  Question {step} of {TOTAL_STEPS}
                </CardDescription>
              </div>
              {!loadingSavedProgress && (
                <div className="flex items-center gap-2 text-sm">
                  {autoSaving ? (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : hasSavedProgress || (phone || city || preferredTime) ? (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Saved
                    </span>
                  ) : null}
                </div>
              )}
            </div>
            <Progress value={(step / TOTAL_STEPS) * 100} className="mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={(e) => e.preventDefault()}>
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
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Assessment;
