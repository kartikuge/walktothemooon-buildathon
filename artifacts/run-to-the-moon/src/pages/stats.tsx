import { useGetRunnerProfile, getGetRunnerProfileQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trophy, Clock, Map, Flame, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Stats() {
    const today = formatDate(new Date());
  const { data: profile, isLoading, isError, refetch } = useGetRunnerProfile(
    { today },
    { query: { queryKey: getGetRunnerProfileQueryKey({ today }), refetchInterval: 10000 } }
  );

  if (isLoading) return <div className="p-8 text-center font-mono text-muted-foreground animate-pulse mt-12">Loading stats...</div>;
  if (isError || !profile) return (
    <div className="p-8 text-center flex flex-col items-center gap-4 mt-12">
      <div className="text-destructive font-mono">Failed to load stats</div>
      <Button onClick={() => refetch()} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
    </div>
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3 mb-6 mt-4">
        <Activity className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold font-mono tracking-tight uppercase text-primary">Lifetime Stats</h1>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20 shadow-lg shadow-primary/5 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
              <Map size={14} className="text-primary" /> Total Miles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-mono">{profile.totalMiles.toFixed(1)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20 shadow-lg shadow-primary/5 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
              <Clock size={14} className="text-primary" /> Time Logged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-mono">{Math.floor(profile.totalMinutes / 60)}<span className="text-base font-normal text-muted-foreground">h</span> {profile.totalMinutes % 60}<span className="text-base font-normal text-muted-foreground">m</span></div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20 shadow-lg shadow-primary/5 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
              <Trophy size={14} className="text-primary" /> Longest Run
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-mono">{profile.longestRun.toFixed(1)}<span className="text-base font-normal text-muted-foreground">mi</span></div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20 shadow-lg shadow-primary/5 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
              <Map size={14} className="text-primary" /> Maps Beaten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-mono">{profile.mapsCompleted}</div>
          </CardContent>
        </Card>

        <Card className="col-span-2 bg-gradient-to-r from-accent/20 to-card border-accent/30 shadow-lg shadow-accent/5 rounded-2xl overflow-hidden relative">
          <div className="absolute right-0 top-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
              <Flame size={14} className="text-accent" /> Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-6xl font-black font-mono text-accent drop-shadow-sm">{profile.currentStreak} <span className="text-2xl font-bold font-sans text-foreground">days</span></div>
            <p className="text-sm text-muted-foreground mt-3 font-medium">
              Consecutive calendar logged days. Today can still be logged!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
