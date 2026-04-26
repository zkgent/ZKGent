import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type FormData = {
  fullName: string;
  workEmail: string;
  company: string;
  role: string;
  useCase: string;
  teamSize: string;
  region: string;
  monthlyVolume: string;
  currentRail: string;
  privacyConcern: string;
  whyConfidential: string;
};

export type ApplicationRecord = FormData & {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const FORM_KEY = "obsidian_form_draft";
const APP_ID_KEY = "obsidian_application_id";

const defaultForm: FormData = {
  fullName: "",
  workEmail: "",
  company: "",
  role: "",
  useCase: "",
  teamSize: "",
  region: "",
  monthlyVolume: "",
  currentRail: "",
  privacyConcern: "",
  whyConfidential: "",
};

type ApplicationContextType = {
  formData: FormData;
  updateForm: (patch: Partial<FormData>) => void;
  applicationId: string | null;
  setApplicationId: (id: string) => void;
  clearApplication: () => void;
};

const ApplicationContext = createContext<ApplicationContextType | null>(null);

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const [formData, setFormData] = useState<FormData>(() => {
    try {
      const stored = localStorage.getItem(FORM_KEY);
      return stored ? { ...defaultForm, ...JSON.parse(stored) } : defaultForm;
    } catch {
      return defaultForm;
    }
  });

  const [applicationId, setApplicationIdState] = useState<string | null>(() => {
    return localStorage.getItem(APP_ID_KEY);
  });

  useEffect(() => {
    localStorage.setItem(FORM_KEY, JSON.stringify(formData));
  }, [formData]);

  const updateForm = (patch: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const setApplicationId = (id: string) => {
    localStorage.setItem(APP_ID_KEY, id);
    setApplicationIdState(id);
  };

  const clearApplication = () => {
    localStorage.removeItem(FORM_KEY);
    localStorage.removeItem(APP_ID_KEY);
    setFormData(defaultForm);
    setApplicationIdState(null);
  };

  return (
    <ApplicationContext.Provider
      value={{ formData, updateForm, applicationId, setApplicationId, clearApplication }}
    >
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplication() {
  const ctx = useContext(ApplicationContext);
  if (!ctx) throw new Error("useApplication must be used within ApplicationProvider");
  return ctx;
}
