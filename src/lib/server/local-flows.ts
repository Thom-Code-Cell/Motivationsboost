import { z } from "zod";
import { generateCvFromDocuments } from "@/ai/flows/generate-cv-from-documents";
import { generateMotivationLetter } from "@/ai/flows/generate-motivation-letter";
import { generateApplicationFeedback } from "@/ai/flows/generate-application-feedback";
import { refineDocumentsForATS } from "@/ai/flows/refine-documents-for-ats";
import { generateInterviewQuestions } from "@/ai/flows/generate-interview-questions";
import { analyzeInterviewAnswer } from "@/ai/flows/analyze-interview-answer";
import { generateLinkedInSummary } from "@/ai/flows/generateLinkedInSummary";
import { generateEmailResponse } from "@/ai/flows/generate-email-response";
import { autofillCVGaps } from "@/ai/flows/autofill-cv-gaps";
import { extractJobKeywords } from "@/ai/flows/extract-job-keywords";
import { analyzeWritingStyle } from "@/ai/flows/analyze-writing-style";
import { analyzeRequiredDocuments } from "@/ai/flows/analyze-required-documents";
import { predictSalaryRange } from "@/ai/flows/predict-salary-range";
import { suggestJobOpportunities } from "@/ai/flows/suggest-job-opportunities";
import { generateMarketingContent } from "@/ai/flows/generate-marketing-content";
import * as s from "@/ai/schemas";

function flow<I extends z.ZodTypeAny>(
  schema: I,
  run: (input: z.output<I>) => Promise<unknown>,
) {
  return (input: unknown) => run(schema.parse(input));
}
export const localFlows: Record<string, (input: unknown) => Promise<unknown>> =
  {
    cv: flow(s.GenerateCvFromDocumentsInputSchema, generateCvFromDocuments),
    letter: flow(
      s.GenerateMotivationLetterInputSchema,
      generateMotivationLetter,
    ),
    ats: flow(
      s.GenerateApplicationFeedbackInputSchema,
      generateApplicationFeedback,
    ),
    refine: flow(s.RefineDocumentsForATSInputSchema, async (input) => {
      // No missing terms means no factual change is warranted. Unsupported skills
      // must never be introduced merely because an advert asks for them.
      const source =
        `${input.cvText}\n${input.coverLetterText}`.toLocaleLowerCase();
      const supported = input.missingKeywords.filter((word) =>
        source.includes(word.toLocaleLowerCase()),
      );
      if (!supported.length) {
        const { checkOllama } = await import("./ollama");
        await checkOllama();
        return {
          refinedCvText: input.cvText,
          refinedCoverLetterText: input.coverLetterText,
        };
      }
      return refineDocumentsForATS({ ...input, missingKeywords: supported });
    }),
    interview: flow(
      s.GenerateInterviewQuestionsInputSchema,
      generateInterviewQuestions,
    ),
    answer: flow(s.AnalyzeInterviewAnswerInputSchema, analyzeInterviewAnswer),
    linkedin: flow(
      s.GenerateLinkedInSummaryInputSchema,
      generateLinkedInSummary,
    ),
    email: flow(s.GenerateEmailResponseInputSchema, generateEmailResponse),
    gaps: flow(s.AutofillCVGapsInputSchema, autofillCVGaps),
    keywords: flow(s.ExtractJobKeywordsInputSchema, extractJobKeywords),
    style: flow(s.AnalyzeWritingStyleInputSchema, analyzeWritingStyle),
    required: flow(
      s.AnalyzeRequiredDocumentsInputSchema,
      analyzeRequiredDocuments,
    ),
    salary: flow(s.PredictSalaryRangeInputSchema, predictSalaryRange),
    jobs: flow(s.SuggestJobOpportunitiesInputSchema, suggestJobOpportunities),
    marketing: flow(
      s.GenerateMarketingContentInputSchema,
      generateMarketingContent,
    ),
  };
