import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ApplicationData = {
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
  submittedAt?: string;
};

const STORAGE_KEY = "obsidian_application";

const defaultData: ApplicationData = {
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
  data: ApplicationData;
  update: (patch: Partial<ApplicationData>) => void;
  submit: () => void;
  isSubmitted: boolean;
  reset: () => void;
};

const ApplicationContext = createContext<ApplicationContextType | null>(null);

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ApplicationData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultData;
    } catch {
      return defaultData;
    }
  });

  const [isSubmitted, setIsSubmitted] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      return !!parsed?.submittedAt;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const update = (patch: Partial<ApplicationData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  };

  const submit = () => {
    const submitted = { ...data, submittedAt: new Date().toISOString() };
    setData(submitted);
    setIsSubmitted(true);
  };

  const reset = () => {
    setData(defaultData);
    setIsSubmitted(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ApplicationContext.Provider value={{ data, update, submit, isSubmitted, reset }}>
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplication() {
  const ctx = useContext(ApplicationContext);
  if (!ctx) throw new Error("useApplication must be used within ApplicationProvider");
  return ctx;
}
