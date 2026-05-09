export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export interface CaseState {
  caseId: string;
  patientId: string;
  createdAt: string; // ISO
  originalInputBn?: string;

  profile: {
    age?: number;
    trimester: "first" | "second" | "third" | "unknown";
    gestationalWeek?: number | null;
    expectedDeliveryDate?: string | null; // ISO date
    lastCheckupDate?: string | null; // ISO date
    lastCheckupGapDays?: number | null;
    riskFactors: {
      hypertension: boolean;
      diabetes: boolean;
      anemia: boolean;
      previousHighRiskPregnancy: boolean;
      previousCSection: boolean;
      previousMiscarriage: boolean;
    };
  };

  symptoms: string[]; // normalized symptom codes only
  severity: Record<string, "mild" | "moderate" | "severe" | "unknown">;
  duration: Record<string, "under_1h" | "1_6h" | "over_6h" | "days" | "unknown">;

  dangerSignsChecked: string[]; // codes only
  followUpAnswers: Record<string, string | boolean | number>;

  history: {
    previousTriageIds: string[];
    previousRiskLevels: RiskLevel[];
    previousHighRiskCount: number;
  };

  meta: {
    locale: "bn" | "en";
    sourceRefs: string[]; // evidence tags for matched rules
  };
}
