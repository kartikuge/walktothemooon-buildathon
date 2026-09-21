import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMoonStateQueryKey, useUpdateMapGoalDate } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MapGoalDate({ mapId, teamId, today, endDate, onSaved }: {
  mapId: number; teamId: number | null; today: string; endDate: string; onSaved: () => void;
}) {
  const client = useQueryClient();
  const mutation = useUpdateMapGoalDate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  return <section className="mb-8 rounded-2xl border border-border bg-card p-4">
    <h2 className="font-bold">Map goal date</h2>
    <p className="my-2 font-mono">{endDate.split("T")[0]}</p>
    {!editing ? <>
      <Button variant="outline" onClick={() => { setDraft(endDate.split("T")[0]); setError(""); setSaved(false); setEditing(true); }}>Change goal date</Button>
      {saved && <p role="status" className="mt-2 text-sm text-primary">Goal date saved. All progress is unchanged.</p>}
    </> : <form noValidate onSubmit={async e => {
      e.preventDefault();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(draft) || !Number.isFinite(Date.parse(draft)) || new Date(draft).toISOString().slice(0, 10) !== draft || draft < today) {
        setError("Choose a valid goal date on or after today."); return;
      }
      setError("");
      try {
        await mutation.mutateAsync({ mapId, data: { today, endDate: draft } });
        await client.invalidateQueries({ queryKey: getGetMoonStateQueryKey() });
        onSaved(); setEditing(false); setSaved(true);
      } catch (err) {
        const data = (err as { data?: { error?: string } }).data;
        setError(data?.error || "Could not save the goal date. Please try again.");
      }
    }}>
      <p className="mb-3 text-sm text-muted-foreground">{teamId ? "Any current team member can change this shared goal date." : "This changes only your solo Map’s goal date."} Runs, stamps, and completion stay unchanged.</p>
      <label htmlFor="map-goal-date" className="text-sm font-medium">New goal date</label>
      <Input id="map-goal-date" type="date" min={today} value={draft} disabled={mutation.isPending} aria-invalid={!!error} aria-describedby={error ? "map-goal-error" : undefined} onChange={e => { setDraft(e.target.value); setError(""); }} />
      {error && <p id="map-goal-error" role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save goal date"}</Button>
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => { setEditing(false); setError(""); }}>Cancel</Button>
      </div>
    </form>}
  </section>;
}