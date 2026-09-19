import { useState, useEffect, useRef } from "react";
import { useUser } from "@/hooks/use-user";
import { useGetActivityProfile, useSaveActivityProfile, getGetActivityProfileQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Plus, Trash2, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ActivitySession, City } from "@workspace/api-client-react";
import { Switch } from "@/components/ui/switch";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ActivityProfilePage() {
  const { userId } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile, isLoading, isError } = useGetActivityProfile(userId, {
    query: { queryKey: getGetActivityProfileQueryKey(userId) }
  });

  const { mutate: saveProfile, isPending } = useSaveActivityProfile();

  const [homeCity, setHomeCity] = useState<City | null>(null);
  const [dailyMiles, setDailyMiles] = useState("");
  const [restDays, setRestDays] = useState<number[]>([]);
  const [commuteMiles, setCommuteMiles] = useState("");
  const [commuteDays, setCommuteDays] = useState<number[]>([]);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  
  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (profile && initializedForId.current !== userId) {
      initializedForId.current = userId;
      setHomeCity(profile.homeCity);
      setDailyMiles(profile.dailyMiles.toString());
      setRestDays(profile.restDays || []);
      setCommuteMiles(profile.commuteMiles.toString());
      setCommuteDays(profile.commuteDays || []);
      setSessions(profile.sessions || []);
    }
  }, [profile, userId]);

  const toggleDay = (dayIndex: number, currentDays: number[], setFn: (days: number[]) => void) => {
    if (currentDays.includes(dayIndex)) {
      setFn(currentDays.filter(d => d !== dayIndex));
    } else {
      setFn([...currentDays, dayIndex].sort());
    }
  };

  const addSession = () => {
    setSessions([
      ...sessions,
      { id: crypto.randomUUID(), name: "New Session", miles: 3, days: [] }
    ]);
  };

  const updateSession = (id: string, updates: Partial<ActivitySession>) => {
    setSessions(sessions.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile(
      {
        userId,
        data: {
          homeCity,
          dailyMiles: Number(dailyMiles) || 0,
          restDays,
          commuteMiles: Number(commuteMiles) || 0,
          commuteDays,
          sessions
        }
      },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetActivityProfileQueryKey(userId), data);
          toast({ title: "Profile saved successfully" });
        },
        onError: () => {
          toast({ title: "Failed to save profile", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return <div className="p-6 text-center mt-20 font-mono animate-pulse">Loading profile...</div>;
  }
  if (isError || !profile) {
    return <div className="p-6 text-center mt-20 font-mono text-destructive">Failed to load profile. Please try again.</div>;
  }

  return (
    <div className="px-5 py-8 animate-in fade-in duration-500 max-w-md mx-auto pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/10 text-primary p-3 rounded-2xl">
          <Activity size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity Profile</h1>
          <p className="text-muted-foreground text-sm font-medium">Set your baseline moving schedule.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Baseline Walking */}
        <section className="bg-card border border-border p-5 rounded-3xl shadow-sm space-y-4">
          <h2 className="font-bold text-lg mb-2">Baseline Walking</h2>
          <p className="text-sm text-muted-foreground mb-4">Average daily incidental walking (excludes commutes/sessions).</p>
          
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Daily Miles</Label>
            <Input 
              type="number" 
              step="0.1" 
              min="0"
              value={dailyMiles}
              onChange={e => setDailyMiles(e.target.value)}
              className="h-14 text-xl font-mono font-bold rounded-2xl"
              placeholder="e.g. 1.5"
            />
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rest Days (No Baseline)</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day, idx) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(idx, restDays, setRestDays)}
                  className={`w-10 h-10 rounded-full font-bold text-xs transition-colors ${restDays.includes(idx) ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                >
                  {day[0]}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Commute */}
        <section className="bg-card border border-border p-5 rounded-3xl shadow-sm space-y-4">
          <h2 className="font-bold text-lg mb-2">Active Commute</h2>
          <p className="text-sm text-muted-foreground mb-4">Round trip miles you walk/run for commuting.</p>
          
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Round Trip Miles</Label>
            <Input 
              type="number" 
              step="0.1" 
              min="0"
              value={commuteMiles}
              onChange={e => setCommuteMiles(e.target.value)}
              className="h-14 text-xl font-mono font-bold rounded-2xl"
              placeholder="e.g. 2.0"
            />
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Commute Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day, idx) => (
                <button
                  key={`commute-${day}`}
                  type="button"
                  onClick={() => toggleDay(idx, commuteDays, setCommuteDays)}
                  className={`w-10 h-10 rounded-full font-bold text-xs transition-colors ${commuteDays.includes(idx) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                >
                  {day[0]}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Dedicated Sessions */}
        <section className="bg-card border border-border p-5 rounded-3xl shadow-sm space-y-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="font-bold text-lg">Dedicated Sessions</h2>
              <p className="text-sm text-muted-foreground">Scheduled runs or long walks.</p>
            </div>
            <Button type="button" onClick={addSession} size="icon" variant="outline" className="rounded-full h-10 w-10">
              <Plus size={16} />
            </Button>
          </div>

          {sessions.length === 0 ? (
            <p className="text-sm italic text-muted-foreground/80 py-4 text-center">No scheduled sessions added.</p>
          ) : (
            <div className="space-y-6 mt-4">
              {sessions.map((session, i) => (
                <div key={session.id} className="border-t border-border pt-4 first:border-0 first:pt-0">
                  <div className="flex justify-between items-center mb-3">
                    <Label className="text-xs uppercase tracking-wider text-accent font-bold">Session {i + 1}</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeSession(session.id)} className="h-8 px-2 text-destructive hover:bg-destructive/10">
                      <Trash2 size={14} className="mr-1" /> Remove
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <Input 
                      value={session.name}
                      onChange={e => updateSession(session.id, { name: e.target.value })}
                      placeholder="Name (e.g. Long Run)"
                      className="rounded-xl font-medium"
                    />
                    <Input 
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={session.miles || ""}
                      onChange={e => updateSession(session.id, { miles: Number(e.target.value) })}
                      placeholder="Miles"
                      className="rounded-xl font-mono"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.map((day, idx) => (
                      <button
                        key={`${session.id}-${day}`}
                        type="button"
                        onClick={() => {
                          const newDays = session.days.includes(idx) 
                            ? session.days.filter(d => d !== idx)
                            : [...session.days, idx].sort();
                          updateSession(session.id, { days: newDays });
                        }}
                        className={`w-8 h-8 rounded-md font-bold text-xs transition-colors ${session.days.includes(idx) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                      >
                        {day[0]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <Button 
          type="submit" 
          disabled={isPending}
          className="w-full h-14 text-lg rounded-2xl"
        >
          {isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
          Save Profile
        </Button>
      </form>
    </div>
  );
}
