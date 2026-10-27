
"use client";

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DollarSign, Users, Activity, Shield, Loader2, BarChart, Rss } from "lucide-react";
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketingCopilot } from './marketing-copilot';

interface AppStats {
    totalUsers: number;
    proUsers: number;
    freeUsers: number;
    mrr: number;
}

interface OwnerDashboardProps {
    user: User | null;
}

export function OwnerDashboard({ user }: OwnerDashboardProps) {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin-stats');
            if (!response.ok) {
                throw new Error('Netzwerk-Antwort war nicht ok.');
            }
            const data: AppStats = await response.json();
            setStats(data);
        } catch (error) {
            console.error("Fehler beim Abrufen der Admin-Statistiken:", error);
            setError("Statistiken konnten nicht geladen werden.");
        } finally {
            setIsLoading(false);
        }
    };

    if (user?.uid) {
        fetchStats();
    }
  }, [user]);
    

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-6 w-6" /> Owner Dashboard</CardTitle>
                <CardDescription>
                    Dies ist Ihre Steuerzentrale. Verfolgen Sie die wichtigsten Kennzahlen und erstellen Sie Marketing-Inhalte mit KI-Unterstützung.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="stats">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="stats"><BarChart className="mr-2 h-4 w-4" />Statistiken</TabsTrigger>
                        <TabsTrigger value="marketing"><Rss className="mr-2 h-4 w-4" />Marketing Co-pilot</TabsTrigger>
                    </TabsList>
                    <TabsContent value="stats" className="pt-6">
                        {error && (
                            <Alert variant="destructive">
                                <Shield className="h-4 w-4" />
                                <AlertTitle>Fehler</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Monatlicher Umsatz (MRR)</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? <Skeleton className="h-7 w-24" /> : (
                                       <div className="text-2xl font-bold">CHF {stats?.mrr.toFixed(2) ?? '0.00'}</div>
                                    )}
                                    <p className="text-xs text-muted-foreground">Basierend auf aktiven pro-Abos</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Pro-Abonnenten</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? <Skeleton className="h-7 w-20" /> : (
                                        <div className="text-2xl font-bold">{stats?.proUsers ?? 0}</div>
                                    )}
                                    <p className="text-xs text-muted-foreground">Aktive, zahlende Nutzer</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Free-Nutzer</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? <Skeleton className="h-7 w-20" /> : (
                                        <div className="text-2xl font-bold">{stats?.freeUsers ?? 0}</div>
                                    )}
                                    <p className="text-xs text-muted-foreground">Kostenlose, aktive Nutzer</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Gesamte Nutzer</CardTitle>
                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? <Skeleton className="h-7 w-20" /> : (
                                        <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
                                    )}
                                    <p className="text-xs text-muted-foreground">Alle registrierten Nutzer</p>
                                </CardContent>
                            </Card>
                        </div>
                         <Alert className="mt-6">
                            <Shield className="h-4 w-4" />
                            <AlertTitle>Hinweis zur Datengenauigkeit</AlertTitle>
                            <AlertDescription>
                                <p>Diese Zahlen basieren auf den in Firestore gespeicherten Abonnement-Daten. Zahlungen sind noch deaktiviert. Nach erfolgter Payrexx-Anbindung sind bestätigte Zahlungen im Payrexx-Dashboard massgebend.</p>
                            </AlertDescription>
                        </Alert>
                    </TabsContent>
                    <TabsContent value="marketing" className="pt-6">
                       <MarketingCopilot />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
  );
}
