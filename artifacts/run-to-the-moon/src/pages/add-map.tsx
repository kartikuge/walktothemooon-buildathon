import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { 
  useGetRunnerProfile, 
  useGetMoonState,
  useSearchPlaces, 
  usePreviewMap, 
  useAddMap, 
  useGetActivityProfile,
  getGetRunnerProfileQueryKey,
  getGetMoonStateQueryKey,
  getSearchPlacesQueryKey,
  type MapPreview,
  type City,
  type RouteInfo
} from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InteractiveMap } from "@/components/interactive-map";
import { EffortCalculator } from "@/components/effort-calculator";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Search, Loader2, Plus } from "lucide-react";

export default function AddMap() {
  const { userId } = useUser();
  const today = formatDate(new Date());
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: isLoadingProfile, error: profileError, refetch: reloadProfile } = useGetRunnerProfile(
    { userId, today },
    { query: { queryKey: getGetRunnerProfileQueryKey({ userId, today }) } }
  );

  const { data: activityProfile } = useGetActivityProfile(userId);
  const { data: state, refetch: reloadMaps } = useGetMoonState({userId,today});

  const [tab, setTab] = useState<"preset" | "custom">("preset");
  
  // Custom Map State
  const [originQuery, setOriginQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  
  const [searchedOriginQuery, setSearchedOriginQuery] = useState("");
  const [searchedDestQuery, setSearchedDestQuery] = useState("");
  
  const [selectedOrigin, setSelectedOrigin] = useState<City | null>(null);
  const [selectedDest, setSelectedDest] = useState<City | null>(null);
  const [mode, setMode] = useState<"virtual" | "walking">("virtual");
  
  const [previewData, setPreviewData] = useState<MapPreview | null>(null);
  const previewVersion = useRef(0);
  const [previewError, setPreviewError] = useState("");
  const [presetRoute, setPresetRoute] = useState<RouteInfo | null>(null);

  // Common State
  const [teamId, setTeamId] = useState<string>("solo");
  const [endDate, setEndDate] = useState<string>("");
  const [saveError, setSaveError] = useState("");
  const existingMap = state?.journeys.find(j =>
    (j.teamId ?? null) === (teamId === "solo" ? null : Number(teamId)) &&
    (tab === "preset" ? j.routeId === presetRoute?.id :
      !!previewData && j.geometry?.mode === previewData.geometry.mode &&
      j.geometry?.origin?.id === previewData.geometry.origin?.id &&
      j.geometry?.destination?.id === previewData.geometry.destination?.id));
  const missingStep = tab === "preset" && !presetRoute ? "Choose a Map above."
    : tab === "custom" && !previewData ? "Select two cities and generate a preview first."
    : !endDate ? "Choose a goal date."
    : endDate < today ? "Choose a goal date on or after today." : "";
  useEffect(() => { setSaveError(""); }, [teamId,endDate,presetRoute,previewData,tab]);

  // Search queries
  const { data: originResults, isFetching: isOriginSearching, error: originError, refetch: retryOrigin } = useSearchPlaces(
    { q: searchedOriginQuery },
    { query: { enabled: searchedOriginQuery.length > 1, queryKey: getSearchPlacesQueryKey({ q: searchedOriginQuery }) } }
  );

  const { data: destResults, isFetching: isDestSearching, error: destError, refetch: retryDest } = useSearchPlaces(
    { q: searchedDestQuery },
    { query: { enabled: searchedDestQuery.length > 1, queryKey: getSearchPlacesQueryKey({ q: searchedDestQuery }) } }
  );

  // Mutations
  const { mutate: fetchPreview, isPending: isPreviewing } = usePreviewMap();
  const { mutate: addMap, isPending: isAdding } = useAddMap();

  // Prefill origin if available
  useEffect(() => {
    if (activityProfile?.homeCity && !selectedOrigin && !originQuery) {
      setSelectedOrigin(activityProfile.homeCity);
      setOriginQuery(activityProfile.homeCity.name);
    }
  }, [activityProfile]);

  // Invalidate preview if inputs change
  useEffect(() => {
    previewVersion.current += 1;
    setPreviewData(null);
    setPreviewError("");
  }, [selectedOrigin, selectedDest, mode, tab]);

  const handleSearchOrigin = (e: React.FormEvent) => {
    e.preventDefault();
    if (originQuery.length > 1) {
      setSearchedOriginQuery(originQuery);
      setSelectedOrigin(null);
    }
  };

  const handleSearchDest = (e: React.FormEvent) => {
    e.preventDefault();
    if (destQuery.length > 1) {
      setSearchedDestQuery(destQuery);
      setSelectedDest(null);
    }
  };

  const generatePreview = () => {
    if (!selectedOrigin || !selectedDest) return;
    const version = ++previewVersion.current;
    setPreviewData(null);
    setPreviewError("");
    
    fetchPreview(
      {
        data: {
          originId: selectedOrigin.id,
          destinationId: selectedDest.id,
          mode
        }
      },
      {
        onSuccess: (data) => { if(version === previewVersion.current) setPreviewData(data); },
        onError: (err: any) => { if(version === previewVersion.current) setPreviewError(err?.data?.error || err.message || "Unable to preview this Map. Try again."); }
      }
    );
  };

  const handleAddMap = () => {
    if (isAdding || existingMap) return;
    if (missingStep) { setSaveError(missingStep); return; }
    if (!endDate || endDate < today) {
      setSaveError("Please select a goal date on or after today");
      return;
    }
    setSaveError("");

    const payload = {
      userId,
      teamId: teamId === "solo" ? null : Number(teamId),
      endDate,
      today
    };

    if (tab === "preset") {
      if (!presetRoute) return;
      Object.assign(payload, { routeId: presetRoute.id });
    } else {
      if (!previewData) return;
      Object.assign(payload, { previewId: previewData.previewId });
    }

    addMap(
      { data: payload },
      {
        onSuccess: (journey) => {
          queryClient.invalidateQueries({ queryKey: getGetMoonStateQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRunnerProfileQueryKey() });
          setLocation(`/journey/${journey.id}`);
        },
        onError: (err: any) => {
          setSaveError(err?.data?.error || err.message || "Could not add this Map. Please try again.");
          reloadMaps();
        }
      }
    );
  };

  if (profileError) {
    return <div className="p-6 text-center space-y-4"><p>Could not load your Maps.</p><Button onClick={() => reloadProfile()}>Try again</Button></div>;
  }
  if (isLoadingProfile || !profile) {
    return <div className="p-6 text-center mt-20 font-mono animate-pulse">Loading...</div>;
  }

  const activeTotalMiles = tab === "preset" ? presetRoute?.totalMiles : previewData?.totalMiles;
  const activeGeometry = tab === "preset" ? presetRoute?.geometry : previewData?.geometry;

  return (
    <div className="px-5 py-8 animate-in fade-in duration-500 max-w-md mx-auto pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/10 text-primary p-3 rounded-2xl">
          <MapPin size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add a Map</h1>
          <p className="text-muted-foreground text-sm font-medium">Start a new journey.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v: string) => setTab(v as any)} className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-secondary rounded-xl p-1 h-12">
          <TabsTrigger value="preset" className="rounded-lg font-bold">Preset Route</TabsTrigger>
          <TabsTrigger value="custom" className="rounded-lg font-bold">City to City</TabsTrigger>
        </TabsList>

        <TabsContent value="preset" className="space-y-6 animate-in fade-in">
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Select Route</Label>
            <div className="grid grid-cols-1 gap-2">
              {profile.routes.map(r => (
                <button
                  key={r.id}
                   type="button"
                   aria-pressed={presetRoute?.id === r.id}
                   onClick={() => setPresetRoute(r)}
                  className={`text-left p-4 rounded-2xl border transition-all ${presetRoute?.id === r.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-card hover:bg-secondary/50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-lg flex items-center gap-2">
                      <span className="text-2xl">{r.emoji}</span> {r.name}
                    </div>
                    <div className="font-mono font-bold text-muted-foreground">{r.totalMiles.toFixed(1)} mi</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6 animate-in fade-in">
          <div className="bg-card border border-border p-5 rounded-3xl shadow-sm space-y-5">
            <div className="space-y-2">
              <Label htmlFor="origin-city" className="text-xs uppercase tracking-wider text-muted-foreground">Origin City</Label>
              <form onSubmit={handleSearchOrigin} className="flex gap-2">
                <Input 
                  id="origin-city"
                  value={originQuery}
                  onChange={e => {
                    setOriginQuery(e.target.value);
                    if (selectedOrigin) setSelectedOrigin(null);
                  }}
                  className="h-12 min-w-0 flex-1 rounded-xl bg-background"
                  placeholder="e.g. London"
                />
                <Button aria-label="Search origin city" type="submit" variant="secondary" size="icon" className="h-12 w-12 rounded-xl shrink-0">
                  <Search size={18} />
                </Button>
              </form>
              
              {isOriginSearching && <div className="text-xs text-muted-foreground flex items-center"><Loader2 size={12} className="animate-spin mr-1"/> Searching...</div>}
              {originError && <p role="alert" className="text-sm">City search is unavailable. <button className="underline" onClick={() => retryOrigin()}>Retry</button></p>}
              {originResults?.length === 0 && !isOriginSearching && <p className="text-sm">No cities found. Try a nearby city or a different spelling.</p>}
              {originResults && !selectedOrigin && originResults.length > 0 && (
                <div className="bg-background border border-border rounded-xl mt-2 overflow-hidden shadow-sm">
                  {originResults.map(city => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => {
                        setSelectedOrigin(city);
                        setOriginQuery(city.label);
                      }}
                      className="w-full text-left px-3 py-2 text-sm border-b border-border last:border-0 hover:bg-secondary/50 font-medium"
                    >
                      {city.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination-city" className="text-xs uppercase tracking-wider text-muted-foreground">Destination City</Label>
              <form onSubmit={handleSearchDest} className="flex gap-2">
                <Input 
                  id="destination-city"
                  value={destQuery}
                  onChange={e => {
                    setDestQuery(e.target.value);
                    if (selectedDest) setSelectedDest(null);
                  }}
                  className="h-12 min-w-0 flex-1 rounded-xl bg-background"
                  placeholder="e.g. Paris"
                />
                <Button aria-label="Search destination city" type="submit" variant="secondary" size="icon" className="h-12 w-12 rounded-xl shrink-0">
                  <Search size={18} />
                </Button>
              </form>

              {isDestSearching && <div className="text-xs text-muted-foreground flex items-center"><Loader2 size={12} className="animate-spin mr-1"/> Searching...</div>}
              {destError && <p role="alert" className="text-sm">City search is unavailable. <button className="underline" onClick={() => retryDest()}>Retry</button></p>}
              {destResults?.length === 0 && !isDestSearching && <p className="text-sm">No cities found. Try a nearby city or a different spelling.</p>}
              {destResults && !selectedDest && destResults.length > 0 && (
                <div className="bg-background border border-border rounded-xl mt-2 overflow-hidden shadow-sm">
                  {destResults.map(city => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => {
                        setSelectedDest(city);
                        setDestQuery(city.label);
                      }}
                      className="w-full text-left px-3 py-2 text-sm border-b border-border last:border-0 hover:bg-secondary/50 font-medium"
                    >
                      {city.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={() => setMode("virtual")}
                  className={`p-3 rounded-xl text-sm font-bold border transition-colors ${mode === 'virtual' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:bg-secondary/50'}`}
                >
                  Direct (Virtual)
                </button>
                <button 
                  type="button"
                  onClick={() => setMode("walking")}
                  className={`p-3 rounded-xl text-sm font-bold border transition-colors ${mode === 'walking' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:bg-secondary/50'}`}
                >
                  Walking Route
                </button>
              </div>
            </div>

            <Button 
              type="button" 
              onClick={generatePreview}
              disabled={!selectedOrigin || !selectedDest || isPreviewing}
              className="w-full h-12 rounded-xl"
            >
              {isPreviewing ? <Loader2 className="animate-spin mr-2" /> : <MapPin className="mr-2" size={18} />}
              Generate Preview
            </Button>
            {previewError && <p role="alert" className="rounded-xl border border-border bg-secondary p-3 text-sm">{previewError}</p>}
          </div>
        </TabsContent>
      </Tabs>

      <section aria-labelledby="map-setup-title" className="mt-6 bg-card border border-border p-5 rounded-3xl shadow-sm space-y-4">
        <h2 id="map-setup-title" className="text-lg font-bold">Set up your Map</h2>
        <div className="space-y-2">
          <Label htmlFor="map-participants">Who is taking part?</Label>
          <select id="map-participants" value={teamId} onChange={e => setTeamId(e.target.value)}
            disabled={isAdding} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm">
            <option value="solo">Solo Journey</option>
            {profile.teams.map(t => <option key={t.id} value={String(t.id)}>Team: {t.name}</option>)}
          </select>
          {!profile.teams.length && <p className="text-xs text-muted-foreground">Want to take part together? <Link href="/teams" className="underline">Create or join a team</Link>.</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="map-goal-date">Goal date (required)</Label>
          <Input id="map-goal-date" type="date" min={today} value={endDate} onChange={e => setEndDate(e.target.value)} disabled={isAdding} className="h-12 rounded-xl" />
        </div>
        {existingMap && <div role="status" className="rounded-xl bg-secondary p-3 text-sm space-y-2">
          <p>This Map is already {existingMap.completed ? "completed" : "enrolled"} for {teamId === "solo" ? "you" : "this team"}. Your miles stay unchanged.</p>
          <Link href={`/journey/${existingMap.id}`} className="block underline font-bold text-primary">Open existing Map</Link>
          <p>Choose another Map or a different participation option to start something new.</p>
        </div>}
        {saveError && <p role="alert" className="rounded-xl bg-secondary p-3 text-sm">{saveError} You can adjust your choices and try again.</p>}
        <Button onClick={handleAddMap} disabled={isAdding || !!missingStep || !!existingMap}
          aria-describedby="map-save-help" className="w-full h-14 text-lg rounded-2xl">
          {isAdding ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
          {isAdding ? "Adding Map…" : "Start Map"}
        </Button>
        <p id="map-save-help" className="text-sm text-muted-foreground">{missingStep || (existingMap ? "Open your existing Map above, or change your selection." : "Ready to start. Previewing the map and calculating effort below are optional for preset Maps.")}</p>
      </section>

      {((tab === "preset" && presetRoute) || (tab === "custom" && previewData)) && (
        <div className="mt-8 space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-card border border-border rounded-3xl p-2 shadow-sm">
            <InteractiveMap geometry={activeGeometry} className="h-64" />
            
            {tab === "custom" && previewData && (
              <div className="p-4 text-center">
                <h3 className="font-bold text-lg">{previewData.name}</h3>
                <div className="text-2xl font-mono font-bold text-primary mt-1">{previewData.totalMiles.toFixed(1)} <span className="text-sm text-foreground">mi</span></div>
              </div>
            )}
          </div>

          <details className="rounded-2xl border border-border">
            <summary className="p-4 cursor-pointer font-bold">Optional: estimate the effort</summary>
          <EffortCalculator 
            userId={userId}
            teamId={teamId === "solo" ? null : Number(teamId)}
            totalMiles={activeTotalMiles || 0}
            today={today}
            endDate={endDate}
            onEndDateChange={setEndDate}
          />

          </details>
        </div>
      )}
    </div>
  );
}
