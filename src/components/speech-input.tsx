
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Textarea } from './ui/core-textarea';
import { Button } from './ui/button';
import { Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Language } from '@/ai/schemas';

interface SpeechInputProps {
    value: string;
    onTextChange: (value: string) => void;
    language: Language;
}

const langMap: Record<Language, string> = {
    de: 'de-DE',
    en: 'en-US',
    fr: 'fr-FR',
    it: 'it-IT',
};

export function SpeechInput({ value, onTextChange, language }: SpeechInputProps) {
    const { toast } = useToast();
    const recognitionRef = useRef<any>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isApiReady, setIsApiReady] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            setIsApiReady(true);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop();
        }
    }, [isRecording]);

    const startRecording = useCallback(() => {
        if (!isApiReady || !recognitionRef.current) {
            toast({ title: 'Nicht verfügbar', description: 'Die Spracherkennung wird von Ihrem Browser nicht unterstützt.', variant: 'destructive' });
            return;
        }
        if (isRecording) {
            return;
        }
        
        const recognitionInstance = recognitionRef.current;

        recognitionInstance.lang = langMap[language];
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        
        recognitionInstance.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                onTextChange(value + finalTranscript + ' ');
            }
        };

        recognitionInstance.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            toast({ title: 'Spracherkennung fehlgeschlagen', description: event.error, variant: 'destructive' });
            setIsRecording(false);
        };

        recognitionInstance.onend = () => {
             setIsRecording(false);
        };

        try {
            recognitionInstance.start();
            setIsRecording(true);
        } catch (e) {
            console.error("Could not start recognition", e);
            toast({ title: 'Fehler beim Starten', description: 'Die Aufnahme konnte nicht gestartet werden.', variant: 'destructive' });
            setIsRecording(false);
        }

    }, [isApiReady, isRecording, language, onTextChange, toast, value]);

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };
    
    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    return (
        <div className="relative">
            <Textarea
                placeholder="Deine Antwort hier eingeben oder aufnehmen..."
                value={value}
                onChange={(e) => onTextChange(e.target.value)}
                className="min-h-[100px] pr-12"
            />
            {isApiReady && (
                <Button
                    type="button"
                    variant={isRecording ? "destructive" : "ghost"}
                    size="icon"
                    className="absolute bottom-2 right-2 h-8 w-8"
                    onClick={toggleRecording}
                    title={isRecording ? "Aufnahme stoppen" : "Antwort aufnehmen"}
                >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
            )}
        </div>
    );
}
