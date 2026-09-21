import { useGetMoonState, getGetMoonStateQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Trophy, Crown } from "lucide-react";

export default function Competition() {
    const today = formatDate(new Date());
  
  const { data: moonState, isLoading } = useGetMoonState(
    { today },
    { query: { queryKey: getGetMoonStateQueryKey({ today }) } }
  );

  if (isLoading || !moonState) {
    return <div className="p-6 font-mono text-center mt-20 animate-pulse">Loading competition...</div>;
  }

  const { competition } = moonState;

  // Sort teams by progress percentage descending
  const teams = [...competition.teams].sort((a, b) => {
    return (b.miles / b.totalMiles) - (a.miles / a.totalMiles);
  });

  return (
    <div className="px-5 py-8 animate-in fade-in duration-500 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#FFD700]/10 text-[#FFD700] p-3 rounded-2xl">
          <Trophy size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams Race</h1>
          <p className="text-muted-foreground text-sm font-medium">{competition.name}</p>
        </div>
      </div>
      
      <div className="bg-card border border-border p-6 rounded-[2rem] shadow-sm relative overflow-hidden">
        {competition.winnerTeamId ? (
          <div className="absolute top-0 right-0 bg-[#FFD700] text-black px-4 py-1.5 rounded-bl-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1 shadow-md z-10">
            <Crown size={14} /> Race Complete
          </div>
        ) : (
          <div className="absolute top-0 right-0 bg-primary text-white px-4 py-1.5 rounded-bl-xl font-bold text-[10px] uppercase tracking-wider z-10">
            Ends {new Date(competition.endDate).toLocaleDateString()}
          </div>
        )}
        
        <div className="space-y-7 mt-4 relative z-0">
          {teams.map((team, idx) => {
            const isWinner = competition.winnerTeamId === team.teamId;
            const progress = (team.miles / team.totalMiles) * 100;
            const isLeading = idx === 0 && !competition.winnerTeamId;

            return (
              <div key={team.id} className="relative">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{team.teamName}</span>
                    {isWinner && <Crown size={16} className="text-[#FFD700] fill-[#FFD700]" />}
                    {isLeading && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                  </div>
                  <div className="font-mono text-sm font-bold text-muted-foreground">
                    <span className="text-foreground">{team.miles.toFixed(1)}</span> / {team.totalMiles.toFixed(0)} <span className="text-xs">mi</span>
                  </div>
                </div>
                
                <div className="h-8 bg-secondary rounded-full overflow-hidden relative border border-border">
                  <div 
                    className="h-full absolute left-0 top-0 transition-all duration-1000 flex items-center justify-end pr-2" 
                    style={{ 
                      width: `${Math.min(progress, 100)}%`,
                      background: `linear-gradient(90deg, ${team.gradientFrom}, ${team.gradientTo})`
                    }}
                  >
                    <span className="text-xl drop-shadow-md">{team.emoji}</span>
                  </div>
                </div>
                
                {isWinner && (
                  <div className="mt-2 text-xs font-bold text-[#FFD700] uppercase tracking-wider flex items-center gap-1">
                    Team Winner
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
