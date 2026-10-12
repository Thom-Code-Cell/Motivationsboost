"use client";
const labels: Record<string, string> = {
  personalInfo: "Persönliche Angaben",
  name: "Name",
  email: "E-Mail",
  phone: "Telefon",
  address: "Adresse",
  linkedin: "LinkedIn",
  summary: "Zusammenfassung",
  sections: "Abschnitte",
  title: "Titel",
  subtitle: "Arbeitgeber / Institution",
  date: "Zeitraum",
  description: "Beschreibung",
  items: "Einträge",
  skills: "Fähigkeiten",
  motivationLetter: "Motivationsschreiben",
  atsScore: "ATS-Schätzung (0–100)",
  scoreReasoning: "Begründung",
  missingKeywords: "Fehlende Begriffe",
  improvementSuggestions: "Verbesserungsvorschläge",
  refinedCvText: "Überarbeiteter Lebenslauf",
  refinedCoverLetterText: "Überarbeitetes Schreiben",
  technicalQuestions: "Fachfragen",
  behavioralQuestions: "Verhaltensfragen",
  questionsForCompany: "Fragen an das Unternehmen",
  relevanceScore: "Relevanzschätzung (0–100)",
  exampleAnswer: "Beispielantwort – Fakten prüfen",
  linkedinSummary: "LinkedIn-Zusammenfassung",
  subjectLine: "Betreff",
  emailBody: "E-Mail-Text",
  filledCvText: "Lebenslauf mit offenen Klärungen",
  fachlicheKompetenzen: "Fachliche Kompetenzen",
  softSkills: "Soziale Kompetenzen",
  schluesselbegriffe: "Schlüsselbegriffe",
  zusammenfassung: "Zusammenfassung",
  tonality: "Ton",
  vocabulary: "Wortwahl",
  sentenceStructure: "Satzbau",
  positiveImpression: "Stärken",
  improvementPotential: "Verbesserungen",
  requiredDocuments: "Benötigte Unterlagen",
  lowerBound: "Geschätzte Untergrenze",
  upperBound: "Geschätzte Obergrenze",
  currency: "Währung",
  justification: "Begründung der Schätzung",
  strategySummary: "Suchstrategie",
  suggestedJobTitles: "Mögliche Rollen",
  suggestedCompanies: "Mögliche Unternehmen – ungeprüft",
  searchLinks: "Suchlinks – nur Text, offline nicht aufgerufen",
  platform: "Plattform",
  url: "Adresse",
  headline: "Überschrift",
  content: "Text",
};
export function LocalResultEditor({
  value,
  onChange,
  name = "Ergebnis",
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  name?: string;
}) {
  const label = labels[name] || name;
  if (typeof value === "string")
    return (
      <label className="local-field">
        {label}
        <textarea
          rows={Math.min(10, Math.max(2, value.split("\n").length))}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  if (typeof value === "number")
    return (
      <label className="local-field">
        {label}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </label>
    );
  if (Array.isArray(value))
    return (
      <fieldset className="local-result">
        <legend>{label}</legend>
        {value.map((item, index) => (
          <LocalResultEditor
            key={index}
            name={`${label} ${index + 1}`}
            value={item}
            onChange={(next) =>
              onChange(value.map((v, i) => (i === index ? next : v)))
            }
          />
        ))}
      </fieldset>
    );
  if (value && typeof value === "object")
    return (
      <fieldset className="local-result">
        <legend>{label}</legend>
        {Object.entries(value).map(([key, item]) => (
          <LocalResultEditor
            key={key}
            name={key}
            value={item}
            onChange={(next) => onChange({ ...value, [key]: next })}
          />
        ))}
      </fieldset>
    );
  return null;
}
