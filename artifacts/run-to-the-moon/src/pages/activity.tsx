import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { 
  useGetActivityProfile, 
  useSaveActivityProfile, 
  getGetActivityProfileQueryKey,
  useSearchPlaces,
  getSearchPlacesQueryKey,
  getGetMoonStateQueryKey,
  getGetRunnerProfileQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Plus, Trash2, Loader2, Save, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ActivitySession, City, ActivityProfile } from "@workspace/api-client-react";
import { validateActivityProfile, type ActivityValidationErrors } from "@/lib/activity-validation";

const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ActivityProfilePage() {
  const { userId } = useUser();
  const { data: profile, isLoading, isError, refetch } = useGetActivityProfile(userId, {
    query: { 
      queryKey: getGetActivityProfileQueryKey(userId),
      retry: false
    }
  });

  if (isLoading) {
    return <div className="p-6 text-center mt-20 font-mono animate-pulse">Loading profile...</div>;
  }
  if (isError || !profile) {
    return (
      <div className="p-6 text-center mt-20 font-mono text-destructive flex flex-col items-center gap-4">
        <AlertCircle size={32} />
        <p>Failed to load profile.</p>
        <Button onClick={() => refetch()} variant="outline">Retry</Button>
      </div>
    );
  }

  // Remount form completely when user changes to protect against stale success edits
  return <ActivityProfileForm key={userId} profile={profile} userId={userId} />;
}

type LocalSession = {
  id: string;
  name: string;
  miles: string;
  days: number[];
};

function ActivityProfileForm({ profile, userId }: { profile: ActivityProfile; userId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { mutate: saveProfile, isPending } = useSaveActivityProfile();

  const [homeCity, setHomeCity] = useState<City | null>(profile.homeCity);
  const [dailyMiles, setDailyMiles] = useState(profile.dailyMiles.toString());
  const [restDays, setRestDays] = useState<number[]>(profile.restDays || []);
  const [commuteMiles, setCommuteMiles] = useState(profile.commuteMiles.toString());
  const [commuteDays, setCommuteDays] = useState<number[]>(profile.commuteDays || []);
  const [sessions, setSessions] = useState<LocalSession[]>((profile.sessions || []).map(s => ({
    ...s,
    miles: s.miles.toString()
  })));

  const [errors, setErrors] = useState<ActivityValidationErrors>({ sessions: {} });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // City Search State
  const [searchQuery, setSearchQuery] = useState("");
  const { data: places, isFetching: isSearching, refetch: doSearch, isError: isSearchError } = useSearchPlaces(
    { q: searchQuery },
    {
      query: { enabled: false, queryKey: getSearchPlacesQueryKey({ q: searchQuery }) }
    }
  );

  const handleSearch = () => {
    if (searchQuery.trim().length >= 2) {
      doSearch();
    }
  };

  // Validations on change if already submitted once
  useEffect(() => {
    setSaveSuccess(false);
    if (hasSubmitted) {
      const { errors: newErrors } = validateActivityProfile({
        dailyMiles, commuteMiles, commuteDays, sessions
      });
      setErrors(newErrors);
    }
  }, [dailyMiles, commuteMiles, commuteDays, sessions, restDays, homeCity]);

  const toggleDay = (dayIndex: number, currentDays: number[], setFn: (days: number[]) => void) => {
    if (currentDays.includes(dayIndex)) {
      setFn(currentDays.filter(d => d !== dayIndex));
    } else {
      setFn([...currentDays, dayIndex].sort());
    }
  };

  const addSession = () => {
    if (sessions.length >= 20) return;
    setSessions([
      ...sessions,
      { id: crypto.randomUUID(), name: "New Session", miles: "3", days: [] }
    ]);
  };

  const updateSession = (id: string, updates: Partial<LocalSession>) => {
    setSessions(sessions.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    setServerError(null);

    const { isValid, errors: newErrors } = validateActivityProfile({
      dailyMiles, commuteMiles, commuteDays, sessions
    });
    setErrors(newErrors);

    if (!isValid) {
      toast({ title: "Validation Error", description: "Please check the form for errors.", variant: "destructive" });
      return;
    }

    const mappedSessions: ActivitySession[] = sessions.map(s => ({
      id: s.id,
      name: s.name.trim(),
      miles: Number(s.miles),
      days: s.days
    }));

    saveProfile(
      {
        userId,
        data: {
          homeCity,
          dailyMiles: Number(dailyMiles),
          restDays,
          commuteMiles: Number(commuteMiles),
          commuteDays,
          sessions: mappedSessions
        }
      },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetActivityProfileQueryKey(userId), data);
          queryClient.invalidateQueries({ queryKey: getGetMoonStateQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRunnerProfileQueryKey() });
          
          toast({ 
            title: "Profile saved successfully", 
            description: `Planned weekly miles: ${data.weeklyMiles.toFixed(1)}` 
          });
          setHasSubmitted(false);
          setSaveSuccess(true);
        },
        onError: (err: any) => {
          const msg = err?.data?.error || err?.response?.data?.error || "Failed to save profile. Please try again.";
          setServerError(msg);
          toast({ title: "Failed to save", description: msg, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="px-5 py-8 animate-in fade-in duration-500 max-w-xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary/10 text-primary p-3 rounded-2xl shrink-0">
          <Activity size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity Profile</h1>
          <p className="text-muted-foreground text-sm font-medium">Set your baseline moving schedule.</p>
        </div>
      </div>

      <div className="bg-primary/5 text-primary-foreground/80 text-sm p-4 rounded-2xl mb-8 border border-primary/20">
        <p className="text-primary font-bold flex items-center gap-2 mb-1">
          <AlertCircle size={16} /> Important Note
        </p>
        <p className="text-muted-foreground">
          Baseline walking excludes commutes and dedicated sessions. Dedicated sessions can still be scheduled on baseline rest days. <strong>Plans never auto-log.</strong> You must still manually log your runs and walks to earn miles.
        </p>
      </div>

      <form id="activity-form" onSubmit={handleSubmit}>
        <fieldset disabled={isPending} className="space-y-8">
          
          {/* Home City Search */}
          <section className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-sm space-y-4">
            <h2 className="font-bold text-lg mb-2">Location</h2>
            <div className="space-y-4">
              <Label htmlFor="activity-city" className="text-xs uppercase tracking-wider text-muted-foreground">Home City (Optional)</Label>
              {homeCity ? (
                <div className="flex items-center justify-between bg-secondary/30 border p-3 rounded-2xl">
                  <div className="font-medium text-sm">{homeCity.label}</div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setHomeCity(null)} className="h-8">
                    <X className="w-4 h-4 mr-1" /> Clear
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input 
                      id="activity-city"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search city..."
                      className="rounded-xl h-11 min-w-0 flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      onClick={handleSearch} 
                      disabled={isSearching || searchQuery.trim().length < 2}
                      className="h-11 w-auto rounded-xl px-4 shrink-0"
                    >
                      {isSearching ? <Loader2 className="animate-spin w-4 h-4" /> : "Search"}
                    </Button>
                  </div>
                  {isSearchError && (
                    <div className="text-sm text-destructive flex items-center gap-2 bg-destructive/10 p-3 rounded-xl">
                      <AlertCircle className="w-4 h-4" /> Failed to search cities. 
                      <Button type="button" variant="link" onClick={handleSearch} className="h-auto p-0 ml-auto">Retry</Button>
                    </div>
                  )}
                  {places && places.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2 bg-background border rounded-xl p-2 max-h-60 overflow-y-auto shadow-sm">
                      {places.map(city => (
                        <button
                          key={city.id}
                          type="button"
                          className="text-left px-3 py-2.5 rounded-lg hover:bg-secondary text-sm transition-colors"
                          onClick={() => setHomeCity(city)}
                        >
                          {city.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {places && places.length === 0 && !isSearching && (
                    <div className="text-sm text-muted-foreground p-3 text-center bg-secondary/20 rounded-xl">No cities found.</div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Baseline Walking */}
          <section className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-sm space-y-5">
            <div>
              <h2 className="font-bold text-lg">Baseline Walking</h2>
              <p className="text-sm text-muted-foreground mt-1">Average daily incidental walking.</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Daily Miles</Label>
              <Input 
                type="text" 
                inputMode="decimal"
                value={dailyMiles}
                onChange={e => setDailyMiles(e.target.value)}
                className={`h-14 text-xl font-mono font-bold rounded-2xl ${errors.dailyMiles ? 'border-destructive' : ''}`}
                placeholder="e.g. 1.5"
              />
              {errors.dailyMiles && <p className="text-xs text-destructive">{errors.dailyMiles}</p>}
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rest Days (No Baseline)</Label>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {FULL_DAYS.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={restDays.includes(idx)}
                    onClick={() => toggleDay(idx, restDays, setRestDays)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl font-bold text-sm transition-colors ${
                      restDays.includes(idx) 
                        ? 'bg-destructive text-destructive-foreground' 
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Commute */}
          <section className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-sm space-y-5">
            <div>
              <h2 className="font-bold text-lg">Active Commute</h2>
              <p className="text-sm text-muted-foreground mt-1">Round trip miles you walk/run for commuting.</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Round Trip Miles</Label>
              <Input 
                type="text" 
                inputMode="decimal"
                value={commuteMiles}
                onChange={e => setCommuteMiles(e.target.value)}
                className={`h-14 text-xl font-mono font-bold rounded-2xl ${errors.commuteMiles ? 'border-destructive' : ''}`}
                placeholder="e.g. 2.0"
              />
              {errors.commuteMiles && <p className="text-xs text-destructive">{errors.commuteMiles}</p>}
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Commute Days</Label>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {FULL_DAYS.map((day, idx) => (
                  <button
                    key={`commute-${day}`}
                    type="button"
                    aria-pressed={commuteDays.includes(idx)}
                    onClick={() => toggleDay(idx, commuteDays, setCommuteDays)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl font-bold text-sm transition-colors ${
                      commuteDays.includes(idx) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {errors.commuteDays && <p className="text-xs text-destructive">{errors.commuteDays}</p>}
            </div>
          </section>

          {/* Dedicated Sessions */}
          <section className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-sm space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">Dedicated Sessions</h2>
                <p className="text-sm text-muted-foreground mt-1">Scheduled runs or long walks.</p>
              </div>
              <Button 
                type="button" 
                onClick={addSession} 
                size="icon" 
                variant="outline" 
                className="rounded-full h-10 w-10 shrink-0"
                disabled={sessions.length >= 20}
              >
                <Plus size={16} />
              </Button>
            </div>

            {errors.general && <p className="text-sm text-destructive">{errors.general}</p>}

            {sessions.length === 0 ? (
              <p className="text-sm italic text-muted-foreground/80 py-4 text-center bg-secondary/10 rounded-2xl border border-dashed border-border">
                No scheduled sessions added.
              </p>
            ) : (
              <div className="space-y-6 mt-4">
                {sessions.map((session, i) => {
                  const sErr = errors.sessions?.[session.id];
                  return (
                    <div key={session.id} className="border-t border-border pt-6 first:border-0 first:pt-2">
                      <div className="flex justify-between items-center mb-4">
                        <Label className="text-xs uppercase tracking-wider text-accent font-bold">Session {i + 1}</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeSession(session.id)} className="h-8 px-2 text-destructive hover:bg-destructive/10">
                          <Trash2 size={14} className="mr-1" /> Remove
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-[1fr_100px] gap-3 mb-4">
                        <div className="space-y-1">
                          <Input 
                            value={session.name}
                            onChange={e => updateSession(session.id, { name: e.target.value })}
                            placeholder="Name (e.g. Long Run)"
                            className={`rounded-xl h-11 font-medium ${sErr?.name ? 'border-destructive' : ''}`}
                          />
                          {sErr?.name && <p className="text-xs text-destructive">{sErr.name}</p>}
                        </div>
                        <div className="space-y-1">
                          <Input 
                            type="text"
                            inputMode="decimal"
                            value={session.miles}
                            onChange={e => updateSession(session.id, { miles: e.target.value })}
                            placeholder="Miles"
                            className={`rounded-xl h-11 font-mono ${sErr?.miles ? 'border-destructive' : ''}`}
                          />
                          {sErr?.miles && <p className="text-xs text-destructive">{sErr.miles}</p>}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                          {FULL_DAYS.map((day, idx) => (
                            <button
                              key={`${session.id}-${day}`}
                              type="button"
                              aria-pressed={session.days.includes(idx)}
                              onClick={() => {
                                const newDays = session.days.includes(idx) 
                                  ? session.days.filter(d => d !== idx)
                                  : [...session.days, idx].sort();
                                updateSession(session.id, { days: newDays });
                              }}
                              className={`min-h-[44px] px-3 py-2 rounded-xl font-bold text-sm transition-colors ${
                                session.days.includes(idx) 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                        {sErr?.days && <p className="text-xs text-destructive">{sErr.days}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <p className="text-sm text-muted-foreground">Saved plan: {profile.weeklyMiles.toFixed(1)} miles per week. These are estimates, not logged miles.</p>
          {saveSuccess && <p role="status" className="text-sm font-medium text-primary">Profile saved. Your updated schedule is ready for Map estimates.</p>}
          {serverError && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Save Failed</p>
                <p>{serverError}</p>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-14 text-lg rounded-2xl shadow-md"
          >
            {isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
            {serverError ? "Retry Save" : "Save Profile"}
          </Button>
        </fieldset>
      </form>
    </div>
  );
}
