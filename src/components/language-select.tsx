"use client";

import { useState } from 'react';
import { LanguageSchema, type Language } from '@/ai/schemas';
import { POPULAR_DOCUMENT_LANGUAGES } from '@/lib/document-languages';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LanguageSelectProps {
  onValueChange: (value: Language) => void;
  defaultValue: Language;
  disabled?: boolean;
}

/**
 * Selects the language of a GENERATED DOCUMENT, not the application interface.
 * Allows BCP-47 tags for users whose language isn't in the quick list.
 */
export function LanguageSelect({ onValueChange, defaultValue, disabled }: LanguageSelectProps) {
  const [customValue, setCustomValue] = useState(defaultValue);
  const [customMode, setCustomMode] = useState(!POPULAR_DOCUMENT_LANGUAGES.some(([tag]) => tag === defaultValue));
  const known = POPULAR_DOCUMENT_LANGUAGES.some(([tag]) => tag === defaultValue);
  return (
    <div className="space-y-2">
      <Select
        value={customMode ? 'other' : (known ? defaultValue : 'other')}
        onValueChange={value => {
          if (value === 'other') setCustomMode(true);
          else { setCustomMode(false); onValueChange(value); }
        }}
        disabled={disabled}
      >
        <SelectTrigger aria-label="Sprache des generierten Dokuments">
          <SelectValue placeholder="Sprache wählen" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {POPULAR_DOCUMENT_LANGUAGES.map(([tag, label]) => (
            <SelectItem key={tag} value={tag}>{label}</SelectItem>
          ))}
          <SelectItem value="other">Weitere Sprache (Sprachcode)</SelectItem>
        </SelectContent>
      </Select>
      {customMode && (
        <label className="block text-sm">
          <span>BCP-47 Sprachcode (z. B. ka, is, zu oder en-IN)</span>
          <input
            type="text"
            value={customValue}
            disabled={disabled}
            maxLength={35}
            onChange={event => setCustomValue(event.target.value)}
            onBlur={() => {
              const parsed = LanguageSchema.safeParse(customValue.trim());
              if (parsed.success) onValueChange(parsed.data);
            }}
            aria-invalid={!LanguageSchema.safeParse(customValue.trim()).success}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
      )}
      <p className="text-xs text-muted-foreground">
        Die gewählte Sprache gilt für KI-Dokumente. Die Benutzeroberfläche ist derzeit noch nicht vollständig übersetzt.
      </p>
    </div>
  );
}
