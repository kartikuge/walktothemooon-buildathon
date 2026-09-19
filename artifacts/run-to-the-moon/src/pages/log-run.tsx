import { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useGetMoonState, useLogRun, getGetMoonStateQueryKey, getGetRunnerProfileQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Watch, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function LogRun() {
  const { userId } = useUser();
  const today = formatDate(new Date());
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: moonState, isLoading: isLoadingState, isError: isErrorState } = useGetMoonState(
    { userId, today },
    { query: { queryKey: getGetMoonStateQueryKey({ userId, today }) } }
  );

  const { mutate: logRun, isPending } = useLogRun();

  const [miles, setMiles] = useState("");
  const [duration, setDuration] = useState("");
  const [loggedAt, setLoggedAt] = useState(today);
  const [journeyId, setJourneyId] = useState("");
  const [simulating, setSimulating] = useState(false);

  // Resolve both the displayed option and submitted IDs from the current runner's Maps.
  const selectedJourney = moonState?.journeys.find(j => j.id === journeyId)
    ?? moonState?.journeys.find(j => j.teamName === "Steel City Striders")
    ?? moonState?.journeys[0];

  const handleSimulate = () => {
    setSimulating(true);
    setTimeout(() => {
      setMiles((Math.random() * 5 + 3).toFixed(1));
      setDuration(Math.floor(Math.random() * 40 + 25).toString());
      setSimulating(false);
    }, 800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!miles || !duration || !selectedJourney || !loggedAt) return;
    const journey = selectedJourney;

    logRun({
      data: {
        userId,
        mapId: journey.mapId,
        routeId: journey.routeId,
        teamId: journey.teamId ?? null,
        miles: Number(miles),
        durationMinutes: Number(duration),
        loggedAt,
        requestId: crypto.randomUUID()
      }
    }, {
      onSuccess: (res) => {
        // Invalidate state for all users to see updated moon counter
        queryClient.invalidateQueries({ queryKey: getGetMoonStateQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRunnerProfileQueryKey() });
        
        if (res.completed) {
          const u = new URLSearchParams();
          u.set('miles', res.milesAdded.toString());
          u.set('moon', res.moonMiles.toString());
          u.set('route', res.routeName);
          u.set('emoji', res.emoji);
          setLocation(`/completion?${u.toString()}`);
        } else {
          // If not completed, just return home
          setLocation('/');
        }
      },
      onError: (err: any) => {
        toast({ title: "Failed to log run", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isLoadingState) {
    return <div className="p-6 text-center mt-20 font-mono animate-pulse">Loading...</div>;
  }
  if (isErrorState || !moonState) {
    return <div className="p-6 text-center mt-20 font-mono text-destructive">Failed to load journeys. Please try again.</div>;
  }

  return (
    <div className="px-5 py-8 animate-in fade-in duration-500 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/10 text-primary p-3 rounded-2xl">
          <Activity size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log a Run</h1>
          <p className="text-muted-foreground text-sm font-medium">Add miles to the pool.</p>
        </div>
      </div>

      <div className="mb-8">
        <Button 
          type="button" 
          variant="outline" 
          className="w-full bg-secondary hover:bg-secondary/80 text-foreground border-none h-14 rounded-2xl font-bold flex items-center justify-center gap-2"
          onClick={handleSimulate}
          disabled={simulating}
        >
          {simulating ? <Loader2 className="animate-spin" size={20} /> : <Watch size={20} />}
          Simulate Watch Sync (Demo)
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border p-5 rounded-3xl shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="miles" className="text-xs uppercase tracking-wider text-muted-foreground">Distance (mi)</Label>
            <Input 
              id="miles" 
              type="number" 
              step="0.1" 
              min="0.1"
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
              className="h-14 text-xl font-mono font-bold rounded-2xl" 
              placeholder="0.0"
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-xs uppercase tracking-wider text-muted-foreground">Duration (min)</Label>
            <Input 
              id="duration" 
              type="number" 
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="h-14 text-xl font-mono font-bold rounded-2xl" 
              placeholder="0"
              required 
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date" className="text-xs uppercase tracking-wider text-muted-foreground">Date (Local)</Label>
          <Input 
            id="date" 
            type="date" 
            value={loggedAt}
            onChange={(e) => setLoggedAt(e.target.value)}
            className="h-14 font-mono font-bold rounded-2xl" 
            required 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="journey" className="text-xs uppercase tracking-wider text-muted-foreground">Journey</Label>
          <div className="relative">
            <select 
              id="journey"
              className="flex h-14 w-full rounded-2xl border border-border bg-card px-4 py-2 text-base font-bold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none pr-10"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231a202c%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
              value={selectedJourney?.id ?? ""}
              onChange={(e) => setJourneyId(e.target.value)}
              required
            >
              {moonState.journeys.map(j => (
                <option key={j.id} value={j.id}>
                  {j.emoji} {j.name} ({j.teamName})
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={isPending || !selectedJourney}
          className="w-full h-14 text-lg rounded-2xl mt-4"
        >
          {isPending ? <Loader2 className="animate-spin mr-2" /> : null}
          Submit Run
        </Button>
      </form>
    </div>
  );
}
