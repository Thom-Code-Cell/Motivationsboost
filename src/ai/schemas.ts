import {z} from 'zod';

export const LanguageSchema = z.enum(['de', 'en', 'fr', 'it']);
export type Language = z.infer<typeof LanguageSchema>;


const CvSectionSchema = z.object({
  title: z.string().describe("The title of the section, e.g., 'Berufserfahrung' or 'Ausbildung'."),
  items: z.array(
    z.object({
      title: z.string().describe("Job title or degree, e.g., 'Softwareentwickler' or 'Master of Science'."),
      subtitle: z.string().describe("Company name or university, e.g., 'Musterfirma GmbH' or 'Technische Universität München'."),
      date: z.string().describe("Date range, e.g., '01/2020 – heute' or '10/2015 – 09/2018'."),
      description: z.string().describe("A bullet point list (using Markdown) of key responsibilities and achievements."),
    })
  ),
});

export const GenerateCvFromDocumentsOutputSchema = z.object({
  personalInfo: z.object({
    name: z.string().describe("The full name of the applicant."),
    email: z.union([z.string().email(), z.literal('')]).describe("The email address."),
    phone: z.string().describe("The phone number."),
    address: z.string().describe("The full address."),
    linkedin: z.string().optional().describe("URL to the LinkedIn profile."),
  }),
  summary: z.string().describe("A short, 2-3 sentence professional summary for the top of the CV."),
  sections: z.array(CvSectionSchema).describe("An array of CV sections, chronologically sorted with the most recent first."),
  skills: z.array(z.string()).describe("A list of key skills."),
});
export type GenerateCvFromDocumentsOutput = z.infer<typeof GenerateCvFromDocumentsOutputSchema>;


// CV Generator
export const GenerateCvFromDocumentsInputSchema = z.object({
  documentTexts: z.array(z.string().trim().min(1).max(100000)).min(1).max(20).describe('An array of text contents from various documents like work certificates, diplomas, etc.'),
  language: LanguageSchema,
});
export type GenerateCvFromDocumentsInput = z.infer<typeof GenerateCvFromDocumentsInputSchema>;


// LinkedIn Summary Schemas
export const GenerateLinkedInSummaryInputSchema = z.object({
  cvData: GenerateCvFromDocumentsOutputSchema.describe("The structured CV data in JSON format."),
  userStyleSample: z.string().optional().describe('A text sample from the user to learn their writing style.'),
  language: LanguageSchema,
});
export type GenerateLinkedInSummaryInput = z.infer<typeof GenerateLinkedInSummaryInputSchema>;

export const GenerateLinkedInSummaryOutputSchema = z.object({
  linkedinSummary: z.string().describe('A professionally written and optimized "About Me" text for LinkedIn, consisting of 3-5 paragraphs.'),
});
export type GenerateLinkedInSummaryOutput = z.infer<typeof GenerateLinkedInSummaryOutputSchema>;


// Interview Coach Schemas
export const AnalyzeInterviewAnswerInputSchema = z.object({
  question: z.string().describe('The interview question that was asked.'),
  userAnswer: z.string().describe("The user's answer to the question."),
  jobUrl: z.string().url().describe('The URL of the job posting for context.'),
  jobText: z.string().max(50000).optional().describe("The job posting text, if provided directly by the user."),
  cvData: z.string().optional().describe("The applicant's CV data for more context."),
  userStyleSample: z.string().optional().describe('A text sample from the user to learn their writing style for the example answer.'),
  language: LanguageSchema,
});
export type AnalyzeInterviewAnswerInput = z.infer<typeof AnalyzeInterviewAnswerInputSchema>;

export const AnalyzeInterviewAnswerOutputSchema = z.object({
  relevanceScore: z.number().min(0).max(100).describe('A score from 0-100 representing how well the answer addresses the question and aligns with the job context.'),
  improvementSuggestions: z.string().describe('Specific, actionable feedback on how to improve the answer (e.g., clarity, depth, STAR method).'),
  exampleAnswer: z.string().describe('An example of a top-tier answer to the question, formulated in a professional tone.'),
});
export type AnalyzeInterviewAnswerOutput = z.infer<typeof AnalyzeInterviewAnswerOutputSchema>;

// Motivation Letter Schemas
export const GenerateMotivationLetterInputSchema = z.object({
  jobUrl: z.string().url().describe('The URL of the job posting.'),
  jobText: z.string().max(50000).optional().describe("The job posting text, if provided directly by the user."),
  stilwahl: z.string().optional().describe('The chosen style for the cover letter.'),
  cvDaten: z.string().describe('The applicant\u2019s CV data.'),
  benutzerprofil: z.string().describe('The applicant\u2019s profile information.'),
  keywords: z.array(z.string()).optional().describe('A list of keywords extracted from the job posting to be included in the letter.'),
  jobSummary: z.string().optional().describe('A summary of the job posting to help align the letter.'),
  userStyleSample: z.string().optional().describe('A text sample from the user to learn their writing style.'),
  language: LanguageSchema,
});
export type GenerateMotivationLetterInput = z.infer<typeof GenerateMotivationLetterInputSchema>;

export const GenerateMotivationLetterOutputSchema = z.object({
  motivationLetter: z.string().describe('The generated cover letter.'),
});
export type GenerateMotivationLetterOutput = z.infer<typeof GenerateMotivationLetterOutputSchema>;

// Application Feedback Schemas
export const GenerateApplicationFeedbackInputSchema = z.object({
  jobUrl: z.string().url().describe('The URL of the job posting to compare against.'),
  jobText: z.string().max(50000).optional().describe("The job posting text, if provided directly by the user."),
  coverLetter: z.string().describe('The cover letter to provide feedback on.'),
  cv: z.string().describe('The CV to provide feedback on.'),
  language: LanguageSchema,
});
export type GenerateApplicationFeedbackInput = z.infer<typeof GenerateApplicationFeedbackInputSchema>;

export const GenerateApplicationFeedbackOutputSchema = z.object({
  atsScore: z.number().min(0).max(100).describe('The estimated ATS score from 0 to 100, representing how well the documents match the job description.'),
  scoreReasoning: z.string().describe('A brief explanation of why this score was given.'),
  missingKeywords: z.array(z.string()).describe('A list of important keywords from the job description that are missing in the documents.'),
  improvementSuggestions: z.string().describe('Specific, actionable suggestions to improve the documents and the ATS score.'),
});
export type GenerateApplicationFeedbackOutput = z.infer<typeof GenerateApplicationFeedbackOutputSchema>;


// Refine Documents Schemas
export const RefineDocumentsForATSInputSchema = z.object({
  cvText: z.string().describe('The original text content of the CV.'),
  coverLetterText: z.string().describe('The original text content of the cover letter.'),
  missingKeywords: z.array(z.string()).describe('A list of keywords to integrate into the documents.'),
  language: LanguageSchema,
});
export type RefineDocumentsForATSInput = z.infer<typeof RefineDocumentsForATSInputSchema>;

export const RefineDocumentsForATSOutputSchema = z.object({
  refinedCvText: z
    .string()
    .describe('The refined CV text with the missing keywords naturally integrated.'),
  refinedCoverLetterText: z
    .string()

    .describe('The refined cover letter text with the missing keywords naturally integrated.'),
});
export type RefineDocumentsForATSOutput = z.infer<typeof RefineDocumentsForATSOutputSchema>;

// Autofill CV Gaps Schemas
export const AutofillCVGapsInputSchema = z.object({
  cvText: z.string().describe('The text content of the CV to analyze for gaps.'),
  language: LanguageSchema,
});
export type AutofillCVGapsInput = z.infer<typeof AutofillCVGapsInputSchema>;

export const AutofillCVGapsOutputSchema = z.object({
  filledCvText: z
    .string()
    .describe('The CV text with gaps identified and filled.'),
});
export type AutofillCVGapsOutput = z.infer<typeof AutofillCVGapsOutputSchema>;


// Extract Job Keywords Schemas
export const ExtractJobKeywordsInputSchema = z.object({
  jobUrl: z.string().url().describe('The URL of the job posting to analyze.'),
  jobText: z.string().max(50000).optional().describe("The job posting text, if provided directly by the user."),
  language: LanguageSchema,
});
export type ExtractJobKeywordsInput = z.infer<typeof ExtractJobKeywordsInputSchema>;

export const ExtractJobKeywordsOutputSchema = z.object({
  fachlicheKompetenzen: z
    .array(z.string())
    .max(10)
    .describe('A list of up to 10 key technical skills and tools required for the job (e.g., SAP, Excel, Projektmanagement, CRM, JavaScript).'),
  softSkills: z
    .array(z.string())
    .max(10)
    .describe('A list of up to 10 key soft skills and personality traits mentioned (e.g., teamfähig, flexibel, analytisch, belastbar).'),
  schluesselbegriffe: z
    .array(z.string())
    .max(10)
    .describe('A list of up to 10 key keywords and task descriptions from the job posting (e.g., Kundenberatung, Prozessoptimierung, Personalführung).'),
  zusammenfassung: z
    .string()
    .describe('A concise summary (2-3 sentences) of the main focus of the job posting, suitable for aligning a cover letter.'),
});
export type ExtractJobKeywordsOutput = z.infer<typeof ExtractJobKeywordsOutputSchema>;


// Generate Interview Questions Schemas
export const GenerateInterviewQuestionsInputSchema = z.object({
  jobUrl: z.string().url().describe('The URL of the job posting to analyze.'),
  jobText: z.string().max(50000).optional().describe("The job posting text, if provided directly by the user."),
  language: LanguageSchema,
  cvData: z.string().optional().describe("The applicant's CV data for more context."),
});
export type GenerateInterviewQuestionsInput = z.infer<typeof GenerateInterviewQuestionsInputSchema>;

export const GenerateInterviewQuestionsOutputSchema = z.object({
  technicalQuestions: z.array(z.string()).describe('A list of technical or domain-specific questions.'),
  behavioralQuestions: z.array(z.string()).describe('A list of behavioral questions (STAR method).'),
  questionsForCompany: z.array(z.string()).describe('A list of insightful questions the applicant can ask the company.'),
  summary: z.string().describe('A brief summary of the ideal candidate profile based on the job description.')
});
export type GenerateInterviewQuestionsOutput = z.infer<typeof GenerateInterviewQuestionsOutputSchema>;

// Job Finder Schemas
export const SuggestJobOpportunitiesInputSchema = z.object({
  cvData: GenerateCvFromDocumentsOutputSchema.describe("The structured CV data in JSON format."),
  location: z.string().describe("The user's desired work location (e.g., 'Zurich, Switzerland')."),
  language: LanguageSchema,
});
export type SuggestJobOpportunitiesInput = z.infer<typeof SuggestJobOpportunitiesInputSchema>;

export const SuggestJobOpportunitiesOutputSchema = z.object({
  strategySummary: z.string().describe("A 2-3 sentence summary explaining the search strategy based on the user's CV."),
  suggestedJobTitles: z.array(z.string()).max(7).describe("A list of 5-7 optimized job titles and keywords for searching."),
  suggestedCompanies: z.array(z.string()).max(7).describe("A list of 5-7 potential employers that fit the user's profile."),
  searchLinks: z.array(z.object({
    platform: z.string().describe("The name of the job platform (e.g., 'Google Jobs', 'LinkedIn')."),
    url: z.string().url().describe("A pre-filled search URL for that platform."),
  })).describe("A list of direct search links for popular job platforms."),
});
export type SuggestJobOpportunitiesOutput = z.infer<typeof SuggestJobOpportunitiesOutputSchema>;


// Marketing Content Schemas
export const GenerateMarketingContentInputSchema = z.object({
    topic: z.string().describe('The main topic or theme for the marketing content (e.g., "new feature launch", "user success story").'),
    format: z.enum(['LinkedIn Post', 'Tweet', 'Blog Article']).describe('The desired format for the content.'),
    language: LanguageSchema,
});
export type GenerateMarketingContentInput = z.infer<typeof GenerateMarketingContentInputSchema>;

export const GenerateMarketingContentOutputSchema = z.object({
    headline: z.string().optional().describe('A catchy headline, especially for blog articles or LinkedIn posts.'),
    content: z.string().describe('The generated marketing content, formatted with Markdown and ready to be used.'),
});
export type GenerateMarketingContentOutput = z.infer<typeof GenerateMarketingContentOutputSchema>;

// Style Analysis Schemas
export const AnalyzeWritingStyleInputSchema = z.object({
  textSample: z.string().describe('A sample text provided by the user.'),
  language: LanguageSchema,
});
export type AnalyzeWritingStyleInput = z.infer<typeof AnalyzeWritingStyleInputSchema>;

export const AnalyzeWritingStyleOutputSchema = z.object({
  tonality: z.string().describe("Description of the text's overall tone (e.g., 'Formal, objective, distant')."),
  vocabulary: z.string().describe("Characterization of the vocabulary used (e.g., 'Simple and clear', 'Complex and academic')."),
  sentenceStructure: z.string().describe("Description of the sentence structure (e.g., 'Short, concise sentences', 'Long, nested sentences')."),
  positiveImpression: z.string().describe("The strengths of the writing style."),
  improvementPotential: z.string().describe("Actionable advice on how to improve or adapt the style."),
});
export type AnalyzeWritingStyleOutput = z.infer<typeof AnalyzeWritingStyleOutputSchema>;

// Email Generator Schemas
export const GenerateEmailResponseInputSchema = z.object({
  scenario: z.enum(['follow_up', 'thank_you', 'rejection_response', 'acceptance']).describe('The context for the email.'),
  companyName: z.string().describe('The name of the company.'),
  jobTitle: z.string().describe('The job title being applied for.'),
  language: LanguageSchema,
});
export type GenerateEmailResponseInput = z.infer<typeof GenerateEmailResponseInputSchema>;

export const GenerateEmailResponseOutputSchema = z.object({
  subjectLine: z.string().describe('A concise and professional subject line for the email.'),
  emailBody: z.string().describe('The complete, ready-to-send body of the email.'),
});
export type GenerateEmailResponseOutput = z.infer<typeof GenerateEmailResponseOutputSchema>;

// TTS Schemas
export const GenerateAudioFromTextInputSchema = z.object({
    text: z.string().describe('The text to be converted to speech.'),
    language: LanguageSchema.describe('The language of the text to be spoken.'),
});
export type GenerateAudioFromTextInput = z.infer<typeof GenerateAudioFromTextInputSchema>;

export const GenerateAudioFromTextOutputSchema = z.object({
    audioDataUri: z.string().describe("The generated audio as a data URI in WAV format. Format: 'data:audio/wav;base64,<encoded_data>'."),
});
export type GenerateAudioFromTextOutput = z.infer<typeof GenerateAudioFromTextOutputSchema>;

// Salary Prediction Schemas
export const PredictSalaryRangeInputSchema = z.object({
  cvData: GenerateCvFromDocumentsOutputSchema.describe("The structured CV data in JSON format."),
  jobUrl: z.string().url().describe('The URL of the job posting for context.'),
  jobText: z.string().max(50000).optional().describe("The job posting text, if provided directly by the user."),
  location: z.string().describe("The user's work location (e.g., 'Zurich, Switzerland')."),
  language: LanguageSchema,
});
export type PredictSalaryRangeInput = z.infer<typeof PredictSalaryRangeInputSchema>;

export const PredictSalaryRangeOutputSchema = z.object({
  lowerBound: z.number().describe("The lower bound of the predicted salary range in the local currency (e.g., CHF, EUR)."),
  upperBound: z.number().describe("The upper bound of the predicted salary range in the local currency."),
  currency: z.string().length(3).describe("The 3-letter currency code (e.g., 'CHF', 'EUR', 'USD')."),
  justification: z.string().describe("A brief (2-3 sentences) justification for the predicted range, considering the user's experience, the job requirements, and the location."),
});
export type PredictSalaryRangeOutput = z.infer<typeof PredictSalaryRangeOutputSchema>;

// Smart Apply Schemas
export const FindMatchingJobsInputSchema = z.object({
  cvData: GenerateCvFromDocumentsOutputSchema.describe("Structured CV data of the user."),
  preferences: z.object({
    keywords: z.array(z.string()),
    locations: z.array(z.string()),
    roles: z.array(z.string()),
  }).describe("User's job search preferences.")
});
export type FindMatchingJobsInput = z.infer<typeof FindMatchingJobsInputSchema>;

export const FindMatchingJobsOutputSchema = z.object({
  jobs: z.array(z.object({
    title: z.string(),
    company: z.string(),
    location: z.string(),
    matchScore: z.number().min(0).max(100).describe("A score from 0 to 100 indicating the match quality."),
    url: z.string().url(),
    platform: z.enum(['LinkedIn', 'Google Jobs', 'Indeed']),
  })).describe("A list of matching job opportunities.")
});
export type FindMatchingJobsOutput = z.infer<typeof FindMatchingJobsOutputSchema>;

// AI Photo Studio Schemas
export const GenerateProfessionalPhotoInputSchema = z.object({
  userPhoto: z.string().describe("A photo of the user, as a data URI that must include a MIME type and use Base64 encoding."),
  style: z.enum(['business', 'modern', 'creative']).describe("The desired style for the professional headshot."),
  prompt: z.string().optional().describe("Optional additional user instructions for the generation."),
});
export type GenerateProfessionalPhotoInput = z.infer<typeof GenerateProfessionalPhotoInputSchema>;

export const GenerateProfessionalPhotoOutputSchema = z.object({
  generatedPhoto: z.string().describe("The generated professional photo as a data URI."),
});
export type GenerateProfessionalPhotoOutput = z.infer<typeof GenerateProfessionalPhotoOutputSchema>;

// Document Check Schemas
export const AnalyzeRequiredDocumentsInputSchema = z.object({
  jobUrl: z.string().url().describe('The URL of the job posting to analyze.'),
  jobText: z.string().max(50000).optional().describe("The job posting text, if provided directly by the user."),
  language: LanguageSchema,
});
export type AnalyzeRequiredDocumentsInput = z.infer<typeof AnalyzeRequiredDocumentsInputSchema>;

export const AnalyzeRequiredDocumentsOutputSchema = z.object({
  requiredDocuments: z.array(z.string()).describe('A list of document names that are required for the application.'),
});
export type AnalyzeRequiredDocumentsOutput = z.infer<typeof AnalyzeRequiredDocumentsOutputSchema>;
