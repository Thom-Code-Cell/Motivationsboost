/** Limited deterministic checks, not a claim of general semantic verification. */
export function checkApplicantFacts(
  feature: string,
  input: unknown,
  output: unknown,
) {
  const value = input as Record<string, unknown>;
  const sources: Record<string, unknown> = {
    cv: value.documentTexts,
    letter: [value.cvDaten, value.benutzerprofil],
    refine: [value.cvText, value.coverLetterText],
    linkedin: value.cvData,
  };
  if (!(feature in sources)) return;
  const source = JSON.stringify(sources[feature]) || "";
  const result = JSON.stringify(output);
  const knownYears = new Set(source.match(/\b(?:19|20)\d{2}\b/g) || []);
  // Letter headers may use the actual current year; applicant history may not.
  if (feature === "letter") knownYears.add(String(new Date().getFullYear()));
  if (
    (result.match(/\b(?:19|20)\d{2}\b/g) || []).some(
      (year) => !knownYears.has(year),
    )
  )
    throw new Error(
      "Die KI hat eine nicht belegte Jahreszahl ergänzt. Der Entwurf wurde verworfen. Bitte erneut versuchen oder den Text manuell bearbeiten.",
    );
  if (feature === "cv") {
    const personal = (output as { personalInfo: Record<string, string> })
      .personalInfo;
    const normalize = (text: string) =>
      text.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    for (const key of ["name", "email", "phone", "address", "linkedin"]) {
      const text = personal[key];
      if (text && !normalize(source).includes(normalize(text)))
        throw new Error(
          "Die KI hat nicht belegte persönliche Angaben ergänzt. Bitte Originaltexte prüfen und erneut versuchen.",
        );
    }
  }
}

export function conservativeGapReport(cvText: string) {
  const years = [...new Set(cvText.match(/\b(?:19|20)\d{2}\b/g) || [])]
    .map(Number)
    .sort((a, b) => a - b);
  const latest = years.at(-1);
  const now = new Date().getFullYear();
  const note =
    latest && latest < now
      ? `Der jüngste genannte Jahreswert ist ${latest}. Für die Zeit danach bis ${now} bitte Angaben ergänzen oder prüfen. Aus den Jahreszahlen allein folgt weder eine Beschäftigung noch eine bestätigte Lücke.`
      : "Bitte Zeiträume vor, zwischen und nach den belegten Stationen prüfen. Aus Jahreszahlen allein lässt sich keine Lückenlosigkeit ableiten.";
  return {
    filledCvText: `${cvText}\n\nOffene Angaben – regelbasierter Prüfhinweis (keine KI-Ergänzung):\n${note}\nEs wurden keine Tätigkeiten oder Erklärungen ergänzt.`,
  };
}
