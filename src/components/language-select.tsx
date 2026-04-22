
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Language } from "@/ai/schemas";

const isLanguage = (value: string): value is Language => {
    return ['de', 'en', 'fr', 'it'].includes(value);
};

interface LanguageSelectProps {
    onValueChange: (value: Language) => void;
    defaultValue: Language;
    disabled?: boolean;
}

export function LanguageSelect({ onValueChange, defaultValue, disabled }: LanguageSelectProps) {
    const handleValueChange = (value: string) => {
        if (isLanguage(value)) {
            onValueChange(value);
        }
    };
    
    return (
        <Select onValueChange={handleValueChange} defaultValue={defaultValue} disabled={disabled}>
            <SelectTrigger>
                <SelectValue placeholder="Sprache wählen..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="de">Deutsch 🇩🇪</SelectItem>
                <SelectItem value="en">Englisch 🇬🇧</SelectItem>
                <SelectItem value="fr">Französisch 🇫🇷</SelectItem>
                <SelectItem value="it">Italienisch 🇮🇹</SelectItem>
            </SelectContent>
        </Select>
    );
}
