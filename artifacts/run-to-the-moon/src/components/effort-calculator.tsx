import { useState, useEffect, useRef } from "react";
import { useEstimateMap } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import type { MapEstimate } from "@workspace/api-client-react";

interface EffortCalculatorProps {
  userId: number;
  teamId: number | null;
  totalMiles: number;
  today: string;
  endDate: string;
  onEndDateChange: (date: string) => void;
  initialParticipantCount?: number;
}

// format local date explicitly
function parseLocalDate(ds: string) {
  if (!ds) return "";
  const [y, m, d] = ds.split('T')[0].split('-');
  return new Date(Number(y), Number(m)-1, Number(d)).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function EffortCalculator({
  userId,
  teamId,
  totalMiles,
  today,
  endDate,
  onEndDateChange,
  initialParticipantCount
}: EffortCalculatorProps) {
  const [participantCount, setParticipantCount] = useState<string>(
    initialParticipantCount ? initialParticipantCount.toString() : ""
  );
  
  const [localResult, setLocalResult] = useState<MapEstimate | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const { mutate: estimate, isPending } = useEstimateMap();
  const currentReqId = useRef(0);

  // Clear stale results immediately when key props/inputs change
  useEffect(() => {
    currentReqId.current += 1;
    setLocalResult(null);
    setErrorMsg("");
  }, [endDate, participantCount, teamId, totalMiles, userId]);

  const handleEstimate = () => {
    setErrorMsg("");
    
    if (!endDate) {
      setErrorMsg("Please select a target date.");
      return;
    }
    if (endDate < today) {
      setErrorMsg("Target date must be today or later.");
      return;
    }
    if (totalMiles <= 0) return;
    
    const count = participantCount ? Number(participantCount) : undefined;
    if (count !== undefined && (!Number.isInteger(count) || count < 1 || count > 10000)) {
      setErrorMsg("Group size must be a whole number between 1 and 10,000.");
      return;
    }
    
    currentReqId.current += 1;
    const reqId = currentReqId.current;
    
    estimate({
      data: {
        userId,
        teamId,
        totalMiles,
        today,
        endDate,
        participantCount: count
      }
    }, {
      onSuccess: (data) => {
        if (reqId === currentReqId.current) {
          setLocalResult(data);
        }
      },
      onError: (err: any) => {
        if (reqId === currentReqId.current) {
          setErrorMsg(err.message || "Failed to calculate estimate.");
        }
      }
    });
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 font-bold text-lg mb-2">
        <Calculator size={20} className="text-primary" /> Effort Estimate
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Target Date</Label>
          <Input 
            type="date" 
            value={endDate}
            min={today}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="h-10 text-sm font-mono rounded-xl"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Hypothetical Group Size</Label>
          <Input 
            type="number" 
            placeholder="e.g. 10"
            min="1"
            value={participantCount}
            onChange={(e) => setParticipantCount(e.target.value)}
            className="h-10 text-sm font-mono rounded-xl"
          />
        </div>
      </div>
      
      {errorMsg && (
        <div className="text-xs font-bold text-destructive flex items-center gap-1.5">
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}
      
      <Button 
        type="button" 
        variant="secondary" 
        className="w-full h-10 rounded-xl text-xs font-bold uppercase tracking-wider"
        onClick={handleEstimate}
        disabled={isPending || !endDate || totalMiles <= 0}
      >
        {isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        Calculate Effort
      </Button>

      {localResult && (
        <div className="mt-4 p-4 bg-secondary/30 rounded-2xl border border-border/50 space-y-4 animate-in fade-in">
          
          <div className="text-sm font-medium leading-relaxed bg-background p-3 rounded-xl border border-border">
            {localResult.explanation}
            {localResult.configuredProfiles === 0 && teamId !== null && !participantCount && (
              <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                Want personalized estimates? <Link href="/activity" className="font-bold underline text-foreground">Set up your activity profile</Link>.
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-background rounded-xl p-3 border border-border">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Group Size</div>
              <div className="font-mono font-bold text-lg">{localResult.participantCount} <span className="text-xs font-sans text-foreground uppercase">People</span></div>
            </div>
            
            <div className="bg-background rounded-xl p-3 border border-border">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Group Weekly</div>
              <div className="font-mono font-bold text-lg">{localResult.weeklyMiles.toFixed(1)} <span className="text-xs font-sans text-foreground uppercase">mi/wk</span></div>
            </div>
            
            <div className="bg-background rounded-xl p-3 border border-border">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Equal Share</div>
              <div className="font-mono font-bold text-lg">{localResult.milesPerPerson.toFixed(1)} <span className="text-xs font-sans text-foreground uppercase">mi/ea</span></div>
            </div>
            
            <div className="bg-background rounded-xl p-3 border border-border">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Required Pace</div>
              <div className="font-mono font-bold text-lg">{localResult.requiredPerPersonDay?.toFixed(2) || "-"} <span className="text-xs font-sans text-foreground uppercase">mi/day</span></div>
            </div>
            
            <div className="bg-background rounded-xl p-3 border border-border">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Calendar Days</div>
              <div className="font-mono font-bold text-lg">{localResult.calendarDays}</div>
            </div>
            
            <div className="bg-background rounded-xl p-3 border border-border">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Active Days</div>
              <div className="font-mono font-bold text-lg">{localResult.activeDays}</div>
            </div>
          </div>
          
          <div className="space-y-2 pt-2">
            {localResult.expectedFinishDate && (
              <div className="flex justify-between items-center bg-background rounded-xl p-3 border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Projected Finish</span>
                <span className="font-mono font-bold text-sm text-right">
                  {parseLocalDate(localResult.expectedFinishDate)}<br/>
                  <span className="text-xs text-muted-foreground font-sans">({localResult.daysToFinish} calendar days, including today)</span>
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-center bg-background rounded-xl p-3 border border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Projected vs Goal</span>
              <span className="font-mono font-bold text-sm">
                {localResult.projectedMilesByGoal.toFixed(1)} mi
              </span>
            </div>
            
            <div className="flex justify-between items-center bg-background rounded-xl p-3 border border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Within Goal?</span>
              <span className="font-bold text-sm">
                {localResult.withinGoal === null ? "N/A" : localResult.withinGoal ? "Yes" : "No"}
              </span>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
