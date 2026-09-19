import { useUser } from "@/hooks/use-user";
import { useGetMoonState, getGetMoonStateQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Stamp as StampIcon } from "lucide-react";

export default function Passport() {
  const { userId } = useUser();
  const today = formatDate(new Date());
  
  const { data: moonState, isLoading } = useGetMoonState(
    { userId, today },
    { query: { queryKey: getGetMoonStateQueryKey({ userId, today }) } }
  );

  if (isLoading || !moonState) {
    return <div className="p-6 font-mono text-center mt-20 animate-pulse">Loading passport...</div>;
  }

  return (
    <div className="px-5 py-8 animate-in fade-in duration-500 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-accent/10 text-accent p-3 rounded-2xl">
          <StampIcon size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Passport</h1>
          <p className="text-muted-foreground text-sm font-medium">Earned stamps along the way.</p>
        </div>
      </div>

      <div className="bg-card border border-border p-2 rounded-[2rem] shadow-sm">
        <div className="bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIyIiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] p-4 rounded-[1.5rem] min-h-[60vh] relative">
          
          {moonState.stamps.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-muted-foreground opacity-60">
              <StampIcon size={48} className="mb-4 opacity-40" />
              <p className="font-bold">No stamps yet.</p>
              <p className="text-sm mt-1">Complete routes to earn stamps.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {moonState.stamps.map((stamp, i) => (
                <div key={i} className="bg-background/80 backdrop-blur-sm border-2 border-border border-dashed p-4 rounded-2xl flex flex-col items-center text-center relative rotate-[2deg] hover:rotate-0 transition-transform shadow-sm">
                  <div className="text-4xl mb-3 drop-shadow-md">{stamp.emoji}</div>
                  <div className="font-bold text-sm leading-tight mb-1">{stamp.routeName}</div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{new Date(stamp.earnedAt).toLocaleDateString()}</div>
                  {stamp.earnedWithTeam && (
                    <div className="absolute -top-2 -right-2 bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border-2 border-background">
                      Team
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
