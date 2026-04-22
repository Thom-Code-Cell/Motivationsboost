
"use client";

import type { GenerateCvFromDocumentsOutput } from "@/ai/schemas";
import { Mail, Phone, Home, Linkedin, MapPin, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface CvPreviewProps {
  cvData: GenerateCvFromDocumentsOutput | null;
  template: string;
  color: string;
}

const colorSchemes: Record<string, { text: string; border: string; bg: string }> = {
    primary: { text: "text-primary", border: "border-primary/30", bg: "bg-primary" },
    elegant: { text: "text-gray-800", border: "border-gray-300", bg: "bg-gray-800" },
    vibrant: { text: "text-blue-600", border: "border-blue-200", bg: "bg-blue-600" },
};

const renderers: Record<string, React.FC<{ cvData: GenerateCvFromDocumentsOutput, colorScheme: { text: string, border: string, bg: string } }>> = {
  modern: ModernTemplate,
  classic: ClassicTemplate,
  minimalist: MinimalistTemplate,
  creative: CreativeTemplate,
  compact: CompactTemplate,
};

export function CvPreview({ cvData, template, color }: CvPreviewProps) {
  if (!cvData) {
    return null;
  }

  const TemplateComponent = renderers[template] || ModernTemplate;
  const colorScheme = colorSchemes[color] || colorSchemes.primary;

  return (
    <div className="bg-white text-black p-4 sm:p-8 md:p-12 font-sans printable-area">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            --tw-shadow: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      <TemplateComponent cvData={cvData} colorScheme={colorScheme} />
    </div>
  );
}

// --- HELPER ---
const renderDescription = (description: string) => {
    if (!description) return null;
    const trimmedDesc = description.trim();
    // Check if the description is likely a Markdown list
    const isList = /^-|\*/.test(trimmedDesc.substring(0, 2));

    if (isList) {
        const listItems = trimmedDesc
            .split('\n')
            .map(item => item.trim().replace(/^- \s*/, '').replace(/^\* \s*/, ''))
            .filter(item => item); // Filter out empty lines

        return (
            <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
                {listItems.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
        );
    }
    
    // Otherwise, treat as a paragraph, splitting by newlines if necessary
    return (
        <div className="mt-2 text-sm text-gray-700 space-y-1 whitespace-pre-wrap">
            {trimmedDesc.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
            ))}
        </div>
    );
};


// --- TEMPLATE COMPONENTS ---
interface TemplateProps {
    cvData: GenerateCvFromDocumentsOutput;
    colorScheme: { text: string, border: string, bg: string };
}

function ModernTemplate({ cvData, colorScheme }: TemplateProps) {
  const { personalInfo, summary, sections, skills } = cvData;
  const workExperience = sections?.find(s => s.title.toLowerCase().includes('berufserfahrung') || s.title.toLowerCase().includes('work experience'));
  const mainSectionTitle = workExperience?.items[0]?.title || '';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
      {/* Left Column */}
      <div className="md:col-span-1 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{personalInfo?.name}</h1>
          <p className={cn("font-semibold text-lg mt-1", colorScheme.text)}>{mainSectionTitle}</p>
        </div>

        <div className="space-y-4 text-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b pb-2">Kontakt</h2>
          <div className="space-y-2">
            <a href={`mailto:${personalInfo?.email}`} className={cn("flex items-center gap-3", `hover:${colorScheme.text}`)}>
              <Mail className="w-4 h-4 text-gray-400"/> <span>{personalInfo?.email}</span>
            </a>
            <a href={`tel:${personalInfo?.phone}`} className={cn("flex items-center gap-3", `hover:${colorScheme.text}`)}>
              <Phone className="w-4 h-4 text-gray-400"/> <span>{personalInfo?.phone}</span>
            </a>
            <p className="flex items-start gap-3">
              <Home className="w-4 h-4 text-gray-400 mt-1"/> <span>{personalInfo?.address}</span>
            </p>
            {personalInfo?.linkedin && (
              <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-3", `hover:${colorScheme.text}`)}>
                <Linkedin className="w-4 h-4 text-gray-400"/> <span>LinkedIn</span>
              </a>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b pb-2">Kenntnisse</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {skills?.map((skill, i) => <li key={i}>• {skill}</li>)}
          </ul>
        </div>
      </div>

      {/* Right Column */}
      <div className="md:col-span-2 space-y-8">
         <div>
            <h2 className={cn("text-lg font-bold uppercase tracking-wider border-b-2 pb-2", colorScheme.text, colorScheme.border)}>Profil</h2>
            <p className="mt-4 text-sm text-gray-700">{summary}</p>
        </div>
        {sections?.map((section, i) => (
          <div key={i}>
            <h2 className={cn("text-lg font-bold uppercase tracking-wider border-b-2 pb-2", colorScheme.text, colorScheme.border)}>{section.title}</h2>
            <div className="mt-4 space-y-6">
              {section.items.map((item, j) => (
                <div key={j}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-md font-semibold text-gray-800">{item.title}</h3>
                    <p className="text-xs font-medium text-gray-500">{item.date}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-600">{item.subtitle}</p>
                   {renderDescription(item.description)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassicTemplate({ cvData, colorScheme }: TemplateProps) {
  const { personalInfo, summary, sections, skills } = cvData;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center border-b-2 pb-4">
        <h1 className="text-4xl font-bold">{personalInfo?.name}</h1>
        <div className="flex justify-center gap-x-6 gap-y-1 mt-2 text-sm text-gray-600 flex-wrap">
          <span>{personalInfo?.address}</span>
          <span>•</span>
          <a href={`mailto:${personalInfo?.email}`} className={cn(`hover:${colorScheme.text}`)}>{personalInfo?.email}</a>
          <span>•</span>
          <a href={`tel:${personalInfo?.phone}`} className={cn(`hover:${colorScheme.text}`)}>{personalInfo?.phone}</a>
          {personalInfo?.linkedin && ( <><span>•</span><a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer" className={cn(`hover:${colorScheme.text}`)}>LinkedIn</a></> )}
        </div>
      </div>

      {/* Summary */}
      <div>
        <h2 className={cn("text-xl font-semibold border-b pb-1", colorScheme.text)}>{colorScheme.text === 'text-gray-800' ? 'Kurzprofil' : 'Profil'}</h2>
        <p className="mt-2 text-sm text-gray-700">{summary}</p>
      </div>

      {/* Sections */}
      {sections?.map((section, i) => (
        <div key={i}>
          <h2 className={cn("text-xl font-semibold border-b pb-1", colorScheme.text)}>{section.title}</h2>
          <div className="mt-4 space-y-4">
            {section.items.map((item, j) => (
              <div key={j} className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4">
                <div className="sm:col-span-1 text-sm text-gray-600 font-medium">{item.date}</div>
                <div className="sm:col-span-3">
                  <h3 className="text-md font-semibold text-gray-800">{item.title}</h3>
                  <p className="text-sm font-medium text-gray-600 italic">{item.subtitle}</p>
                   {renderDescription(item.description)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Skills */}
      <div>
        <h2 className={cn("text-xl font-semibold border-b pb-1", colorScheme.text)}>Kenntnisse & Fähigkeiten</h2>
        <p className="mt-2 text-sm text-gray-700">{skills?.join(', ')}</p>
      </div>
    </div>
  );
}

function MinimalistTemplate({ cvData, colorScheme }: TemplateProps) {
  const { personalInfo, summary, sections, skills } = cvData;

  return (
    <div className="font-serif space-y-6 text-gray-800">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-normal tracking-widest uppercase text-center">{personalInfo?.name}</h1>
        <div className="text-xs text-center mt-2 flex justify-center gap-4 flex-wrap">
            <a href={`mailto:${personalInfo?.email}`} className="hover:underline">{personalInfo?.email}</a>
            <span>|</span>
            <a href={`tel:${personalInfo?.phone}`} className="hover:underline">{personalInfo?.phone}</a>
             <span>|</span>
            <span>{personalInfo?.address}</span>
            {personalInfo?.linkedin && ( <><span>|</span><a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer" className="hover:underline">linkedin</a></> )}
        </div>
      </div>
       <hr />

      {/* Summary */}
      <p className="text-center text-sm italic">{summary}</p>
      

      {/* Sections */}
      {sections?.map((section, i) => (
        <div key={i}>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3">{section.title}</h2>
          <div className="space-y-4 border-l-2 border-gray-200 pl-4">
            {section.items.map((item, j) => (
              <div key={j} className="relative">
                <div className={cn("absolute -left-[1.2rem] top-1.5 h-3 w-3 rounded-full bg-gray-300", colorScheme.text === 'text-primary' ? 'bg-primary/50' : colorScheme.text === 'text-blue-600' ? 'bg-blue-300' : 'bg-gray-300' )}></div>
                 <p className="text-xs text-gray-500">{item.date}</p>
                 <h3 className="text-md font-semibold">{item.title}</h3>
                 <p className="text-sm text-gray-600">{item.subtitle}</p>
                 {renderDescription(item.description)}
              </div>
            ))}
          </div>
        </div>
      ))}
      
      <hr />
      {/* Skills */}
       <div>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-2 text-center">Kenntnisse</h2>
        <p className="text-sm text-center text-gray-600">{skills?.join(' • ')}</p>
      </div>
    </div>
  );
}

function CreativeTemplate({ cvData, colorScheme }: TemplateProps) {
  const { personalInfo, summary, sections, skills } = cvData;
  const workExperience = sections?.find(s => s.title.toLowerCase().includes('berufserfahrung') || s.title.toLowerCase().includes('work experience'));
  const education = sections?.find(s => s.title.toLowerCase().includes('ausbildung') || s.title.toLowerCase().includes('education'));
  const otherSections = sections?.filter(s => s !== workExperience && s !== education);

  return (
    <div className="flex flex-col md:flex-row gap-8 min-h-[29.7cm]">
      {/* Sidebar */}
      <div className={cn("md:w-1/3 p-6 text-white rounded-lg", colorScheme.bg)}>
        <h1 className="text-3xl font-bold">{personalInfo?.name}</h1>
        <p className="text-lg mt-1 opacity-90">{workExperience?.items[0]?.title || ''}</p>
        
        <hr className="my-6 border-white/30" />

        <div className="space-y-4">
          <h2 className="font-bold uppercase tracking-widest text-sm">Kontakt</h2>
          <div className="space-y-2 text-sm">
            <a href={`mailto:${personalInfo?.email}`} className="flex items-center gap-3 opacity-90 hover:opacity-100">
              <Mail className="w-4 h-4"/> <span>{personalInfo?.email}</span>
            </a>
            <a href={`tel:${personalInfo?.phone}`} className="flex items-center gap-3 opacity-90 hover:opacity-100">
              <Phone className="w-4 h-4"/> <span>{personalInfo?.phone}</span>
            </a>
            <p className="flex items-start gap-3 opacity-90">
              <MapPin className="w-4 h-4 mt-1"/> <span>{personalInfo?.address}</span>
            </p>
            {personalInfo?.linkedin && (
              <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 opacity-90 hover:opacity-100">
                <Globe className="w-4 h-4"/> <span>LinkedIn Profil</span>
              </a>
            )}
          </div>
        </div>

        <hr className="my-6 border-white/30" />

        <div className="space-y-4">
          <h2 className="font-bold uppercase tracking-widest text-sm">Kenntnisse</h2>
          <div className="flex flex-wrap gap-2">
            {skills?.map((skill, i) => <span key={i} className="text-xs bg-white/20 rounded-full px-3 py-1">{skill}</span>)}
          </div>
        </div>

      </div>

      {/* Main Content */}
      <div className="md:w-2/3 p-6 space-y-8">
        <div>
          <h2 className={cn("text-xl font-bold uppercase tracking-widest", colorScheme.text)}>Profil</h2>
          <p className="mt-2 text-sm text-gray-700">{summary}</p>
        </div>

        {workExperience && (
          <div>
            <h2 className={cn("text-xl font-bold uppercase tracking-widest", colorScheme.text)}>{workExperience.title}</h2>
            <div className="mt-4 space-y-6">
              {workExperience.items.map((item, j) => (
                <div key={j}>
                  <p className="text-xs font-medium text-gray-500">{item.date}</p>
                  <h3 className="text-md font-semibold text-gray-800">{item.title}</h3>
                  <p className="text-sm font-medium text-gray-600">{item.subtitle}</p>
                  {renderDescription(item.description)}
                </div>
              ))}
            </div>
          </div>
        )}

        {education && (
          <div>
            <h2 className={cn("text-xl font-bold uppercase tracking-widest", colorScheme.text)}>{education.title}</h2>
             <div className="mt-4 space-y-6">
              {education.items.map((item, j) => (
                <div key={j}>
                  <p className="text-xs font-medium text-gray-500">{item.date}</p>
                  <h3 className="text-md font-semibold text-gray-800">{item.title}</h3>
                  <p className="text-sm font-medium text-gray-600">{item.subtitle}</p>
                  {renderDescription(item.description)}
                </div>
              ))}
            </div>
          </div>
        )}

        {otherSections?.map((section, i) => (
            <div key={`other-${i}`}>
                <h2 className={cn("text-xl font-bold uppercase tracking-widest", colorScheme.text)}>{section.title}</h2>
                <div className="mt-4 space-y-6">
                    {section.items.map((item, j) => (
                        <div key={`other-item-${j}`}>
                        <p className="text-xs font-medium text-gray-500">{item.date}</p>
                        <h3 className="text-md font-semibold text-gray-800">{item.title}</h3>
                        <p className="text-sm font-medium text-gray-600">{item.subtitle}</p>
                        {renderDescription(item.description)}
                        </div>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}

function CompactTemplate({ cvData, colorScheme }: TemplateProps) {
  const { personalInfo, summary, sections, skills } = cvData;
  const workExperience = sections?.find(s => s.title.toLowerCase().includes('berufserfahrung') || s.title.toLowerCase().includes('work experience'));
  const mainSectionTitle = workExperience?.items[0]?.title || '';

  return (
    <div className="space-y-5 text-sm">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">{personalInfo?.name}</h1>
        <div className={cn("text-lg font-medium", colorScheme.text)}>
            {mainSectionTitle}
        </div>
        <div className="flex justify-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 flex-wrap">
          <a href={`mailto:${personalInfo?.email}`} className="flex items-center gap-1 hover:text-gray-800"><Mail className="w-3 h-3"/>{personalInfo?.email}</a>
          <a href={`tel:${personalInfo?.phone}`} className="flex items-center gap-1 hover:text-gray-800"><Phone className="w-3 h-3"/>{personalInfo?.phone}</a>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{personalInfo?.address}</span>
          {personalInfo?.linkedin && <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-gray-800"><Linkedin className="w-3 h-3"/>LinkedIn</a>}
        </div>
      </div>

      {/* Summary */}
      <div>
        <h2 className={cn("text-sm font-bold uppercase tracking-wider border-b-2 pb-1", colorScheme.border)}>Profil</h2>
        <p className="mt-2 text-gray-700">{summary}</p>
      </div>

      {/* Sections */}
      {sections?.map((section, i) => (
        <div key={i}>
          <h2 className={cn("text-sm font-bold uppercase tracking-wider border-b-2 pb-1", colorScheme.border)}>{section.title}</h2>
          <div className="mt-3 space-y-3">
            {section.items.map((item, j) => (
              <div key={j}>
                <div className="flex justify-between items-baseline">
                  <h3 className="font-semibold text-gray-800">{item.title} <span className="text-gray-500 font-normal">bei {item.subtitle}</span></h3>
                  <p className="text-xs font-medium text-gray-500 text-right shrink-0 ml-4">{item.date}</p>
                </div>
                {renderDescription(item.description)}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Skills */}
      <div>
        <h2 className={cn("text-sm font-bold uppercase tracking-wider border-b-2 pb-1", colorScheme.border)}>Kenntnisse</h2>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {skills?.map((skill, i) => <p key={i} className="text-gray-700">{skill}</p>)}
        </div>
      </div>
    </div>
  );
}
