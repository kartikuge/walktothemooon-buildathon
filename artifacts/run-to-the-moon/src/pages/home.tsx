import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useGetMoonState, getGetMoonStateQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";

export default function Home() {
  const { userId } = useUser();
  const today = formatDate(new Date());
  
  const { data: moonState, isLoading } = useGetMoonState(
    { userId, today },
    { query: { queryKey: getGetMoonStateQueryKey({ userId, today }), refetchInterval: 10000 } }
  );

  if (isLoading || !moonState) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-64 bg-secondary rounded-3xl"></div>
        <div className="h-24 bg-secondary rounded-2xl"></div>
        <div className="h-32 bg-secondary rounded-2xl"></div>
        <div className="h-32 bg-secondary rounded-2xl"></div>
      </div>
    );
  }

  const { moonMiles, moonGoal, dailyTarget, restDay, journeys } = moonState;
  const progress = (moonMiles / moonGoal) * 100;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-moon-gradient text-white pt-8 pb-10 px-6 rounded-b-[2rem] shadow-xl relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay" 
          style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.8), transparent 70%)' }} 
        />
        <div className="relative z-10 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-white/70 mb-3">To the Moon</div>
          <div className="text-5xl font-mono font-bold tracking-tighter mb-1 drop-shadow-md">
            {moonMiles.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </div>
          <div className="text-lg font-mono text-white/60 mb-8">
            / {moonGoal.toLocaleString()} mi
          </div>
          
          <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10 backdrop-blur-md relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-20"></div>
            <div 
              className="h-full bg-gradient-to-r from-blue-400 via-indigo-300 to-white rounded-full relative transition-all duration-1000 ease-out" 
              style={{ width: `${Math.max(2, Math.min(progress, 100))}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-xl filter drop-shadow-md">🚀</div>
            </div>
          </div>
          <div className="text-xs text-white/60 mt-3 font-medium uppercase tracking-wider">pooled by all teams</div>
        </div>
      </div>

      <div className="px-5 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight">Today's Target</h2>
          {restDay && <span className="text-xs font-bold bg-accent/20 text-accent px-2 py-1 rounded-md uppercase tracking-wider">Rest Day</span>}
        </div>
        
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm relative overflow-hidden">
          {restDay ? (
            <div>
              <div className="text-4xl font-mono font-bold text-muted-foreground opacity-50">{dailyTarget} mi</div>
              <div className="text-sm font-medium mt-2 text-foreground">It's a rest day! Extra miles count toward the moon.</div>
            </div>
          ) : (
            <div>
              <div className="text-4xl font-mono font-bold text-primary">{dailyTarget} mi</div>
              <div className="text-sm font-medium mt-2 text-muted-foreground">Let's hit this target together. Every mile counts.</div>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 mt-10 mb-8">
        <h2 className="text-lg font-bold tracking-tight mb-4">Active Journeys</h2>
        <div className="flex flex-col gap-4">
          {journeys.map(j => {
            const jProgress = (j.miles / j.totalMiles) * 100;
            return (
              <Link key={j.id} href={`/journey/${j.id}`} className="block">
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                  <div 
                    className="h-28 flex items-center justify-center text-5xl relative" 
                    style={{ background: `linear-gradient(135deg, ${j.gradientFrom}, ${j.gradientTo})` }}
                  >
                    <div className="drop-shadow-lg">{j.emoji}</div>
                    <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-md px-2 py-1 text-xs text-white rounded-lg font-mono font-bold border border-white/10 shadow-xl">
                      {j.miles.toFixed(1)} / {j.totalMiles.toFixed(0)} mi
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-lg leading-tight">{j.name}</h3>
                      {j.completed && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md font-bold uppercase">Done</span>}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-4">{j.teamName}</p>
                    
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(jProgress, 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          
          {journeys.length === 0 && (
            <div className="text-center p-8 bg-secondary/50 rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground font-medium">No active journeys found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
