import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { countriesApi, Country, usersApi } from "@/api";
import { useAuth } from "@/contexts/AuthContext";

interface CountrySelectionModalProps {
  open: boolean;
  onClose: () => void;
}

export const CountrySelectionModal = ({ open, onClose }: CountrySelectionModalProps) => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const data = await countriesApi.getAll();
        setCountries(data);
      } catch (error) {
        console.error("Failed to fetch countries:", error);
        toast.error("Failed to load countries");
      } finally {
        setIsFetching(false);
      }
    };

    if (open) {
      fetchCountries();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedCountryId) {
      toast.error("Please select your country");
      return;
    }

    setIsLoading(true);
    try {
      // Update user profile with selected country
      await usersApi.updateProfile({ countryId: selectedCountryId });

      // Refresh user data in context
      await refreshUser();

      // Find selected country to check if it's active
      const selectedCountry = countries.find(c => c.id === selectedCountryId);

      toast.success("Country saved!");
      onClose();

      // Redirect based on country status
      if (selectedCountry?.isActive) {
        navigate("/dashboard");
      } else {
        // For inactive countries, redirect to assessment first if not completed
        // The Dashboard will handle redirecting to ComingSoon after assessment
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Failed to save country:", error);
      toast.error("Failed to save country selection");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Where are you located?</DialogTitle>
          <DialogDescription>
            Please select your country to personalize your Enqoy experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select
              value={selectedCountryId}
              onValueChange={setSelectedCountryId}
              disabled={isFetching}
            >
              <SelectTrigger id="country">
                <SelectValue placeholder={isFetching ? "Loading countries..." : "Select your country"} />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={isLoading || !selectedCountryId}
          >
            {isLoading ? "Saving..." : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CountrySelectionModal;
