import { useState } from "react";
import { Link, useParams } from "wouter";
import { useGetAccountStatus, useGetMoonState, getGetMoonStateQueryKey, useGetTeamMapLeaderboard, getGetTeamMapLeaderboardQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Users } from "lucide-react";
import { InteractiveMap } from "@/components/interactive-map";
import { EffortCalculator } from "@/components/effort-calculator";
import { MapGoalDate } from "@/components/map-goal-date";
import { Trophy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function TeamLeaderboard({ teamId, mapId }: { teamId: number, mapId: number }) {
  const { data: accountStatus } = useGetAccountStatus();
  const { data: leaderboard, isLoading, isError, refetch } = useGetTeamMapLeaderboard(
    teamId, mapId,
    { query: { queryKey: getGetTeamMapLeaderboardQueryKey(teamId, mapId), refetchInterval: 10000 } }
  );

  if (isLoading) {
    return (
      <section aria-label="Challenge leaderboard" className="bg-card border border-border p-5 rounded-[2rem] shadow-sm mb-8 animate-pulse">
        <div className="h-6 w-48 bg-secondary rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-secondary rounded-xl"></div>
          <div className="h-16 bg-secondary rounded-xl"></div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section aria-label="Challenge leaderboard" className="bg-card border border-border p-5 rounded-[2rem] shadow-sm mb-8 flex flex-col items-center justify-center gap-3">
        <span className="text-sm font-medium text-destructive">Failed to load leaderboard</span>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="rounded-full">
          <RefreshCw size={14} className="mr-2" /> Retry
        </Button>
      </section>
    );
  }

  if (!leaderboard || !leaderboard.leaderboardEnabled) return null;

  return (
    <section aria-label="Challenge leaderboard" className="bg-card border border-border p-5 rounded-[2rem] shadow-sm mb-8">
      <div className="flex items-center gap-2 mb-4 text-primary">
        <Trophy size={20} />
        <h3 className="font-bold uppercase tracking-wider text-sm">Challenge Leaderboard</h3>
      </div>
      
      {leaderboard.members.length === 0 ? (
        <div className="text-center p-6 bg-secondary/30 rounded-xl border border-dashed border-border">
          <p className="text-sm font-medium text-muted-foreground">No runs logged for this challenge yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.members.map(member => (
            <div key={member.userId} className={`flex items-center justify-between p-3 rounded-xl border ${member.userId === (accountStatus?.runner?.id) ? 'bg-primary/5 border-primary/20' : 'bg-background border-border'}`}>
              <div className="flex items-center gap-3">
                <div className="w-6 text-center font-bold text-muted-foreground">{member.rank}</div>
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl shadow-sm">{member.avatarEmoji}</div>
                <div className="font-bold text-sm text-foreground">{member.name} {member.userId === (accountStatus?.runner?.id) && "(You)"}</div>
              </div>
              <div className="font-mono font-bold text-sm text-foreground">{member.miles.toFixed(1)} <span className="text-muted-foreground text-xs">mi</span></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function JourneyDetail() {
  const { id } = useParams<{ id: string }>();
    const today = formatDate(new Date());
  
  const { data: moonState, isLoading, isError, refetch: refetchMoon } = useGetMoonState(
    { today },
    { query: { queryKey: getGetMoonStateQueryKey({ today }), refetchInterval: 10000 } }
  );

  const journey = moonState?.journeys.find(j => j.id === id);
  const [calcDate, setCalcDate] = useState<string>("");

  if (isLoading) {
    return <div className="p-6 h-screen flex items-center justify-center font-mono text-muted-foreground animate-pulse">Loading journey...</div>;
  }

  if (isError || !moonState) {
    return (
      <div className="p-6 h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-destructive font-bold">Failed to load journey</div>
        <Button onClick={() => refetchMoon()} variant="outline"><RefreshCw className="mr-2" size={16} /> Retry</Button>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="p-6 text-center mt-20">
        <h1 className="text-2xl font-bold mb-2">Journey not found</h1>
        <Link href="/app" className="text-primary font-bold">Return Home</Link>
      </div>
    );
  }

  const activeCalcDate = calcDate || journey.endDate.split('T')[0];

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 pb-8">
      <div 
        className="h-[35vh] flex flex-col items-center justify-center text-8xl relative overflow-hidden rounded-b-[2.5rem] shadow-lg" 
        style={{ background: `linear-gradient(135deg, ${journey.gradientFrom}, ${journey.gradientTo})` }}
      >
        <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')]"></div>
        <Link href="/app" className="absolute top-4 left-4 bg-black/20 text-white p-3 rounded-full backdrop-blur-md hover:bg-black/40 transition-colors z-10 border border-white/10">
          <ArrowLeft size={20} strokeWidth={3} />
        </Link>
        <div className="drop-shadow-2xl animate-in zoom-in duration-700 ease-out z-10">{journey.emoji}</div>
      </div>
      
      <div className="px-5 py-6">
        <h1 className="text-3xl font-bold tracking-tight mb-1">{journey.name}</h1>
        <p className="text-lg font-medium text-muted-foreground mb-8">{journey.teamName}</p>
        
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pooled Progress</div>
            <div className="text-2xl font-mono font-bold text-primary">{journey.miles.toFixed(1)} <span className="text-sm">mi</span></div>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Remaining</div>
            <div className="text-2xl font-mono font-bold">{journey.remainingMiles.toFixed(1)} <span className="text-sm">mi</span></div>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Daily Target</div>
            <div className="text-2xl font-mono font-bold">{journey.dailyTarget.toFixed(1)} <span className="text-sm">mi</span></div>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Days Left</div>
            <div className="text-2xl font-mono font-bold">{journey.daysRemaining}</div>
          </div>
        </div>

        <div className="bg-secondary/50 rounded-2xl p-5 mb-8 border border-border space-y-4 shadow-inner">
          <div className="flex justify-between items-center pb-1">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <Users size={16} /> Team Members
            </div>
            <span className="font-mono font-bold text-lg">{journey.memberCount}</span>
          </div>
        </div>

        {journey.teamId && journey.mapId && (
          <TeamLeaderboard teamId={journey.teamId} mapId={journey.mapId}  />
        )}

        <div className="mb-8">
          <InteractiveMap 
            geometry={journey.geometry} 
            fraction={Math.min(1, journey.miles / Math.max(0.1, journey.totalMiles))} 
          />
        </div>

        {journey.mapId && <MapGoalDate key={`${journey.mapId}`} mapId={journey.mapId}  teamId={journey.teamId ?? null} today={today} endDate={journey.endDate} onSaved={() => setCalcDate("")} />}

        {!journey.completed && (
          <div className="mb-8">
            <EffortCalculator 
              
              teamId={journey.teamId || null}
              totalMiles={journey.remainingMiles}
              today={today}
              endDate={activeCalcDate}
              onEndDateChange={setCalcDate}
            />
          </div>
        )}
        
        <div className="text-center px-4 py-8 border-t border-border mt-auto">
          <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed italic">
            "No shame mechanics. We don't tell you you're behind. Miss a day and a teammate covers it — every mile goes into one pool."
          </p>
        </div>
      </div>
    </div>
  );
}
