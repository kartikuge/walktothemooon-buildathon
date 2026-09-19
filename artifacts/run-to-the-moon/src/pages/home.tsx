import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useGetMoonState, getGetMoonStateQueryKey, useGetRunnerProfile, getGetRunnerProfileQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Flame, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { userId } = useUser();
  const today = formatDate(new Date());
  
  const { data: moonState, isLoading } = useGetMoonState(
    { userId, today },
    { query: { queryKey: getGetMoonStateQueryKey({ userId, today }), refetchInterval: 10000 } }
  );

  const { data: profile, isLoading: isProfileLoading, isError: isProfileError, refetch: refetchProfile } = useGetRunnerProfile(
    { userId, today },
    { query: { queryKey: getGetRunnerProfileQueryKey({ userId, today }), refetchInterval: 10000 } }
  );

  if (isLoading || !moonState) {
    return (
      <div className="p-6 space-y-6 animate-pulse bg-background min-h-screen">
        <div className="h-64 bg-secondary rounded-[2rem]"></div>
        <div className="h-24 bg-secondary rounded-2xl"></div>
        <div className="h-32 bg-secondary rounded-2xl"></div>
        <div className="h-32 bg-secondary rounded-2xl"></div>
      </div>
    );
  }

  const { moonMiles, moonGoal, dailyTarget, restDay, journeys } = moonState;
  const progress = (moonMiles / moonGoal) * 100;

  return (
    <div className="animate-in fade-in duration-500 bg-background min-h-screen pb-6">
      <div className="bg-primary text-primary-foreground pt-12 pb-14 px-6 rounded-b-[2rem] shadow-[0_10px_30px_rgba(33,101,234,0.15)] relative overflow-hidden flex flex-col items-center justify-center">
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay" 
          style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.8), transparent 70%)' }} 
        />
        <div className="relative z-10 text-center w-full">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/80 mb-4">To the Moon</div>
          <div className="text-6xl font-bold tracking-tighter mb-2 drop-shadow-sm flex items-baseline justify-center gap-1">
            {moonMiles.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </div>
          <div className="text-lg text-primary-foreground/70 mb-10 font-medium">
            / {moonGoal.toLocaleString()} mi
          </div>
          
          <div className="h-6 bg-black/20 rounded-full overflow-hidden border border-white/10 relative shadow-inner">
            <div 
              className="h-full bg-white rounded-full relative transition-all duration-1000 ease-out" 
              style={{ width: `${Math.max(2, Math.min(progress, 100))}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-2xl filter drop-shadow-md">🚀</div>
            </div>
          </div>
          <div className="text-xs text-primary-foreground/70 mt-4 font-semibold uppercase tracking-widest">pooled by all teams</div>
        </div>
      </div>

      <div className="px-6 mt-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Today's Target</h2>
          {restDay && <span className="text-[10px] font-bold bg-accent text-accent-foreground px-3 py-1.5 rounded-full uppercase tracking-widest">Rest Day</span>}
        </div>
        
        <div className="bg-card border border-border p-6 rounded-[2rem] shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          {restDay ? (
            <div>
              <div className="text-5xl font-bold text-muted-foreground opacity-50 tracking-tighter">{dailyTarget} <span className="text-2xl font-medium">mi</span></div>
              <div className="text-sm font-medium mt-3 text-muted-foreground">It's a rest day! Extra miles count toward the moon.</div>
            </div>
          ) : (
            <div>
              <div className="text-5xl font-bold text-primary tracking-tighter">{dailyTarget} <span className="text-2xl font-medium">mi</span></div>
              <div className="text-sm font-medium mt-3 text-muted-foreground">Let's hit this target together. Every mile counts.</div>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 mt-8">
        {isProfileLoading ? (
          <div className="h-28 bg-secondary rounded-[2rem] animate-pulse flex items-center justify-center text-muted-foreground font-medium text-sm">
            Loading streak...
          </div>
        ) : isProfileError || !profile ? (
          <div className="h-28 bg-card border border-destructive/20 rounded-[2rem] flex flex-col items-center justify-center gap-3 shadow-sm">
            <span className="text-destructive font-medium text-sm">Failed to load streak</span>
            <Button size="sm" variant="outline" onClick={() => refetchProfile()} className="rounded-full">
              <RefreshCw size={14} className="mr-2" /> Retry
            </Button>
          </div>
        ) : profile.currentStreak === 0 ? (
          <div className="bg-secondary/50 border border-border p-6 rounded-[2rem] shadow-sm flex items-center gap-5">
            <div className="p-4 bg-background rounded-full opacity-50 grayscale shadow-sm shrink-0">
              <Flame size={28} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight text-foreground mb-1">Start a Streak</h3>
              <p className="text-sm font-medium text-muted-foreground">Log a run today to begin.</p>
            </div>
          </div>
        ) : (
          <div className="bg-accent/30 border border-accent/50 p-6 rounded-[2rem] shadow-sm flex items-center gap-5 relative overflow-hidden">
            <div className="p-4 bg-accent text-accent-foreground rounded-full shadow-[0_0_20px_rgba(var(--accent),0.5)] shrink-0 z-10">
              <Flame size={28} />
            </div>
            <div className="z-10">
              <div className="text-xs font-bold text-accent-foreground uppercase tracking-widest mb-1">Current Streak</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-foreground tracking-tighter">{profile.currentStreak}</span>
                <span className="font-semibold text-muted-foreground">days</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 mt-10 mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Active Maps</h2>
          <Link href="/maps/add" className="text-xs font-bold bg-secondary text-foreground px-4 py-2 rounded-full hover:bg-secondary/80 transition-colors uppercase tracking-widest">
            + Add
          </Link>
        </div>
        <div className="flex flex-col gap-5">
          {journeys.map(j => {
            const jProgress = (j.miles / j.totalMiles) * 100;
            return (
              <Link key={j.id} href={`/journey/${j.id}`} className="block">
                <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                  <div 
                    className="h-32 flex items-center justify-center text-6xl relative" 
                    style={{ background: `linear-gradient(135deg, ${j.gradientFrom}, ${j.gradientTo})` }}
                  >
                    <div className="drop-shadow-xl transform group-hover:scale-110 transition-transform duration-300">{j.emoji}</div>
                    <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-md px-3 py-1.5 text-xs text-foreground rounded-full font-bold shadow-sm">
                      {j.miles.toFixed(1)} / {j.totalMiles.toFixed(0)} mi
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg leading-tight text-foreground">{j.name}</h3>
                      {j.completed && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-md font-bold uppercase tracking-widest">Done</span>}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-5">{j.teamName}</p>
                    
                    <div className="h-3 bg-secondary rounded-full overflow-hidden relative">
                      <div 
                        className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${Math.min(jProgress, 100)}%` }} 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 font-medium">Goal date: <span className="text-foreground">{j.endDate.split("T")[0]}</span></p>
                  </div>
                </div>
              </Link>
            );
          })}
          
          {journeys.length === 0 && (
            <div className="text-center p-10 bg-secondary/30 rounded-[2rem] border border-dashed border-border">
              <p className="text-muted-foreground font-medium">No active maps found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
