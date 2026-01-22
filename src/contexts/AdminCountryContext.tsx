import React, { createContext, useContext, useState, useEffect } from 'react';
import { countriesApi, Country } from '@/api';

interface AdminCountryContextType {
  countries: Country[];
  selectedCountryId: string | null;
  selectedCountry: Country | null;
  setSelectedCountryId: (id: string | null) => void;
  isLoading: boolean;
}

const AdminCountryContext = createContext<AdminCountryContextType | undefined>(undefined);

const STORAGE_KEY = 'admin_selected_country';

export const AdminCountryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryId, setSelectedCountryIdState] = useState<string | null>(() => {
    // Initialize from localStorage
    return localStorage.getItem(STORAGE_KEY);
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const data = await countriesApi.getAll();
        setCountries(data || []);

        // If no country is selected and we have countries, select the first active one
        if (!selectedCountryId && data && data.length > 0) {
          const activeCountry = data.find(c => c.isActive);
          if (activeCountry) {
            setSelectedCountryIdState(activeCountry.id);
            localStorage.setItem(STORAGE_KEY, activeCountry.id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch countries:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCountries();
  }, []);

  const setSelectedCountryId = (id: string | null) => {
    setSelectedCountryIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const selectedCountry = countries.find(c => c.id === selectedCountryId) || null;

  return (
    <AdminCountryContext.Provider
      value={{
        countries,
        selectedCountryId,
        selectedCountry,
        setSelectedCountryId,
        isLoading,
      }}
    >
      {children}
    </AdminCountryContext.Provider>
  );
};

export const useAdminCountry = () => {
  const context = useContext(AdminCountryContext);
  if (context === undefined) {
    throw new Error('useAdminCountry must be used within an AdminCountryProvider');
  }
  return context;
};
