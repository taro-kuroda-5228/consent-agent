export interface CaseData {
  caseId: string;
  age: number;
  sex: "Male" | "Female" | "Other";
  diagnosis: string;
  urgency: string;
  plannedSurgery: string;
  purpose: string;
  cardiopulmonaryBypass: boolean;
  transfusion: "Likely required" | "May be required" | "Unlikely";
  risks: string[];
  notes: string;
}

export interface ExplanationSection {
  id: string;
  icon: string;
  title: string;
  content: string;
}

export interface FAQ {
  question: string;
  answer: string;
  requiresDoctorReview?: boolean;
}

export interface FreeQA {
  question: string;
  answer: string;
}

export interface UnderstandingQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface UnderstandingCheck {
  questions: UnderstandingQuestion[];
}

export interface SummarySection {
  understood: string[];
  notUnderstood: string[];
  concerns: string[];
  doctorQuestions: string[];
}

export interface FHIRConsent {
  resourceType: "Consent";
  id: string;
  status: "proposed" | "active" | "rejected";
  scope: {
    coding: { system: string; code: string; display: string }[];
  };
  category: {
    coding: { system: string; code: string; display: string }[];
  }[];
  patient: {
    reference: string;
    display: string;
  };
  dateTime: string;
  policyRule: {
    coding: { system: string; code: string }[];
  };
}

export interface ConsentHandoff {
  caseId: string;
  summary: SummarySection;
  understandingScore: number;
  totalQuestions: number;
  doctorReviewRequired: boolean;
  fhirConsent: FHIRConsent;
  patientConcerns: string;
}
