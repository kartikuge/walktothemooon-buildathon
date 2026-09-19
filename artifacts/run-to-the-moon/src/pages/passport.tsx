import { useUser } from "@/hooks/use-user";
import { useGetRunnerProfile, getGetRunnerProfileQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Stamp as StampIcon, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Passport() {
  const { userId } = useUser();
  const today = formatDate(new Date());
  
  const { data: profile, isLoading, isError, refetch } = useGetRunnerProfile(
    { userId, today },
    { query: { queryKey: getGetRunnerProfileQueryKey({ userId, today }), refetchInterval: 10000 } }
  );

  if (isLoading) return <div className="p-8 text-center font-mono text-muted-foreground animate-pulse mt-12">Loading passport...</div>;
  if (isError || !profile) return (
    <div className="p-8 text-center flex flex-col items-center gap-4 mt-12">
      <div className="text-destructive font-mono">Failed to load passport</div>
      <Button onClick={() => refetch()} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
    </div>
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3 mb-6 mt-4">
        <StampIcon className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold font-mono tracking-tight uppercase text-primary">Passport</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {profile.routes.map(route => {
          const stamp = profile.stamps.find(s => s.routeId === route.id);
          const isEarned = !!stamp;
          
          return (
             <div 
               key={route.id} 
               className={`relative p-5 rounded-3xl border shadow-xl flex flex-col items-center text-center overflow-hidden ${
                 isEarned 
                   ? 'border-transparent text-white' 
                   : 'bg-card border-border grayscale opacity-60 text-muted-foreground shadow-none'
               }`}
               style={isEarned ? { background: `linear-gradient(135deg, ${route.gradientFrom}, ${route.gradientTo})` } : {}}
             >
                {isEarned && (
                  <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full bg-white/20 blur-2xl pointer-events-none" />
                )}
                
                <div className="text-6xl mb-3 z-10 drop-shadow-md mt-2">{route.emoji}</div>
                <div className="font-black text-lg leading-tight z-10 drop-shadow-sm px-1">{route.name}</div>
                <div className="text-[10px] font-bold font-mono tracking-widest mt-1 opacity-90 z-10">{route.totalMiles} MILES</div>
                
                <div className="mt-5 flex flex-col gap-2 items-center z-10 w-full mb-1">
                  {isEarned ? (
                    <>
                      <Badge variant="secondary" className="bg-black/30 hover:bg-black/30 text-white/90 border-none font-mono font-bold text-[10px] uppercase w-full justify-center py-1">
                        Earned {new Date(stamp.earnedAt).toLocaleDateString()}
                      </Badge>
                      {stamp.earnedWithTeam && (
                        <Badge variant="secondary" className="bg-white hover:bg-white text-black border-none font-mono font-bold text-[10px] uppercase w-full justify-center py-1">
                          👥 Team Badge
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Badge variant="outline" className="font-mono text-[10px] uppercase w-full justify-center py-1 border-dashed border-muted-foreground/40 text-muted-foreground bg-muted/50">
                      Locked
                    </Badge>
                  )}
                </div>
             </div>
          )
        })}
      </div>
    </div>
  )
}
