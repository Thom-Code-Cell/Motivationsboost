
"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

interface HeroSectionProps {
    children?: React.ReactNode;
    className?: string;
}

export function HeroSection({ children, className }: HeroSectionProps) {
    return (
        <div className={cn("relative flex items-center justify-center w-full", className)}>
            <div className="absolute inset-0 overflow-hidden -z-10">
                <Image 
                    src="https://placehold.co/1600x900.png" 
                    alt="AI background with abstract shapes" 
                    fill
                    priority
                    className="object-cover"
                    data-ai-hint="abstract technology"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
            </div>
            {children}
        </div>
    );
}
