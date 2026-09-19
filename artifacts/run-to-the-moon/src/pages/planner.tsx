import { useState, useMemo } from "react";
import { useUser } from "@/hooks/use-user";
import { useGetRunnerProfile, getGetRunnerProfileQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Route, Calculator, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { planByEndDate, planByDailyMiles } from "@/lib/planner";

export default function Planner() {
  const { userId } = useUser();
  const today = formatDate(new Date());
  
  const { data: profile, isLoading, isError, refetch } = useGetRunnerProfile(
    { userId, today },
    { query: { queryKey: getGetRunnerProfileQueryKey({ userId, today }), refetchInterval: 10000 } }
  );

  const [routeId, setRouteId] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [dailyMiles, setDailyMiles] = useState<string>("");

  const selectedRoute = useMemo(() => profile?.routes.find(r => r.id.toString() === routeId), [profile, routeId]);

  const restDays = profile?.restDays || [0, 6]; 

  const endDatePlan = useMemo(() => {
    if (!selectedRoute || !targetDate) return null;
    const start = new Date(); 
    const end = new Date(targetDate);
    end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
    return planByEndDate(selectedRoute.totalMiles, start, end, restDays);
  }, [selectedRoute, targetDate, restDays]);

  const dailyMilesPlan = useMemo(() => {
    if (!selectedRoute || !dailyMiles || isNaN(Number(dailyMiles))) return null;
    const start = new Date();
    return planByDailyMiles(selectedRoute.totalMiles, start, Number(dailyMiles), restDays);
  }, [selectedRoute, dailyMiles, restDays]);

  if (isLoading) return <div className="p-8 text-center font-mono text-muted-foreground animate-pulse mt-12">Loading planner...</div>;
  if (isError || !profile) return (
    <div className="p-8 text-center flex flex-col items-center gap-4 mt-12">
      <div className="text-destructive font-mono">Failed to load planner data</div>
      <Button onClick={() => refetch()} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
    </div>
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3 mb-2 mt-4">
        <Calculator className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold font-mono tracking-tight uppercase text-primary">Route Planner</h1>
      </div>
      
      <p className="text-muted-foreground text-sm font-medium px-1">
        Calculate your pacing for full route distances. Automatically skips your configured rest days. <br/><br/>
        <span className="text-xs opacity-70 italic">Note: These calculations use the full route distance, ignoring partial team quotas.</span>
      </p>

      <Card className="border-primary/10 shadow-xl shadow-primary/5 rounded-3xl overflow-hidden">
        <CardContent className="p-5">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-muted-foreground"><Route size={14}/> Select Route</Label>
              <Select value={routeId} onValueChange={setRouteId}>
                <SelectTrigger className="h-14 rounded-2xl font-bold text-base bg-secondary/50 border-transparent">
                  <SelectValue placeholder="Choose a route..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {profile.routes.map(r => (
                    <SelectItem key={r.id} value={String(r.id)} className="font-bold py-3">
                      {r.emoji} {r.name} <span className="opacity-50 text-xs font-mono ml-2">{r.totalMiles} mi</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRoute && (
              <Tabs defaultValue="by-date" className="w-full animate-in fade-in slide-in-from-bottom-2">
                <TabsList className="grid w-full grid-cols-2 p-1 bg-secondary/50 rounded-2xl h-14">
                  <TabsTrigger value="by-date" className="rounded-xl font-bold uppercase text-xs tracking-wider">Target Date</TabsTrigger>
                  <TabsTrigger value="by-miles" className="rounded-xl font-bold uppercase text-xs tracking-wider">Daily Pace</TabsTrigger>
                </TabsList>

                <TabsContent value="by-date" className="space-y-5 pt-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-muted-foreground"><Calendar size={14}/> I want to finish by...</Label>
                    <Input type="date" className="h-14 rounded-2xl font-mono text-base font-bold bg-secondary/30 border-primary/20" value={targetDate} onChange={e => setTargetDate(e.target.value)} min={today} />
                  </div>
                  
                  {endDatePlan && (
                    <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 mt-4 relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                      {endDatePlan.error ? (
                        <div className="flex items-start gap-2 text-destructive font-medium text-sm relative z-10">
                          <AlertCircle size={18} className="shrink-0 mt-0.5" /> <span>{endDatePlan.error}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 relative z-10">
                          <div className="text-xs text-primary font-bold uppercase tracking-widest">Required Pace</div>
                          <div className="text-5xl font-black font-mono text-primary flex items-baseline gap-2 mt-1">
                            {endDatePlan.milesPerDay} <span className="text-lg font-bold font-sans text-foreground uppercase tracking-wider">mi/day</span>
                          </div>
                          <div className="text-sm font-medium text-muted-foreground mt-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary inline-block"></span> over {endDatePlan.activeDays} active running days
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="by-miles" className="space-y-5 pt-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-muted-foreground"><Route size={14}/> I want to run...</Label>
                    <div className="flex items-center gap-3">
                      <Input type="number" step="0.1" min="0.1" className="h-14 rounded-2xl font-mono text-xl font-bold bg-secondary/30 border-accent/30" value={dailyMiles} onChange={e => setDailyMiles(e.target.value)} placeholder="0.0" />
                      <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">mi / day</span>
                    </div>
                  </div>
                  
                  {dailyMilesPlan && (
                    <div className="p-5 rounded-2xl bg-accent/10 border border-accent/20 mt-4 relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-32 h-32 bg-accent/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                      {dailyMilesPlan.error ? (
                        <div className="flex items-start gap-2 text-destructive font-medium text-sm relative z-10">
                          <AlertCircle size={18} className="shrink-0 mt-0.5" /> <span>{dailyMilesPlan.error}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 relative z-10">
                          <div className="text-xs text-accent-foreground font-bold uppercase tracking-widest">Estimated Finish</div>
                          <div className="text-2xl font-black font-mono text-foreground flex items-baseline gap-1 mt-2">
                            {dailyMilesPlan.finishDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="text-sm font-medium text-muted-foreground mt-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-accent inline-block"></span> after {dailyMilesPlan.activeDays} active running days
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
