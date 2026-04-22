"use client";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Target, MessageCircleQuestion, PenSquare, Star, Send, Award } from 'lucide-react';
import type { ProgressData, BadgeId } from "@/types/progress";
import { BadgeConfig } from "@/types/progress";
import * as React from 'react';

// Map badge IDs to Lucide icons
const badgeIcons: Record<BadgeId, React.ElementType> = {
  cvReady: FileText,
  atsWin: Target,
  interviewMaster: MessageCircleQuestion,
  motivationsHeld: PenSquare,
  proUser: Star,
  firstApplicationSent: Send,
};

interface ProgressTrackerProps {
  progress: ProgressData | null;
}

export function ProgressTracker({ progress }: ProgressTrackerProps) {
  if (!progress) {
    return null; // Don't render if progress is not loaded yet
  }
  
  const getMotivationalMessage = () => {
    if (progress.progressScore < 20) return "Legen Sie los und verdienen Sie Ihr erstes Abzeichen!";
    if (progress.progressScore < 50) return "Super Start! Der nächste Schritt wartet schon.";
    if (progress.progressScore < 80) return "Sie sind auf einem tollen Weg. Bald sind Sie ein Bewerbungs-Profi!";
    if (progress.progressScore < 100) return "Fast am Ziel! Nur noch wenige Schritte bis zum perfekten Profil.";
    return "Grossartig! Sie sind bestens für den Bewerbungsmarathon gerüstet.";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ihr Fortschritt zum Top-Profil</CardTitle>
        <CardDescription>{getMotivationalMessage()}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Progress value={progress.progressScore} className="h-3" />
            <span className="font-bold text-lg text-primary">{progress.progressScore}%</span>
          </div>
          <div className="pt-4">
            <h4 className="text-sm font-semibold mb-3">Verdiente Abzeichen</h4>
            {progress.earnedBadges.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                    {progress.earnedBadges.map((badgeId) => {
                        const Icon = badgeIcons[badgeId] || Award;
                        const config = BadgeConfig[badgeId];
                        return (
                             <TooltipProvider key={badgeId}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex flex-col items-center gap-2 cursor-pointer">
                                            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 text-primary border-2 border-primary">
                                                <Icon className="h-7 w-7" />
                                            </div>
                                            <span className="text-xs font-medium text-center text-foreground w-16 truncate">{config.name}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{config.description}</p>
                                    </TooltipContent>
                                </Tooltip>
                             </TooltipProvider>
                        );
                    })}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">Noch keine Abzeichen verdient. Legen Sie los!</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
