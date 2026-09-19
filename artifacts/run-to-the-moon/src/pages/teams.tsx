import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { 
  useGetRunnerProfile, 
  getGetRunnerProfileQueryKey, 
  getGetMoonStateQueryKey,
  useCreateTeam, 
  useJoinTeam 
} from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Copy, CheckCircle, Rocket, Link as LinkIcon, Plus, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const createTeamSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name too long"),
  routeId: z.coerce.number().min(1, "Select a route"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
});

const joinTeamSchema = z.object({
  inviteCode: z.string().length(6, "Code must be exactly 6 characters"),
});

export default function Teams() {
  const { userId } = useUser();
  const today = formatDate(new Date());
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: profile, isLoading, isError, refetch } = useGetRunnerProfile(
    { userId, today },
    { query: { queryKey: getGetRunnerProfileQueryKey({ userId, today }), refetchInterval: 10000 } }
  );

  const createTeam = useCreateTeam();
  const joinTeam = useJoinTeam();

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const createForm = useForm<z.infer<typeof createTeamSchema>>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: "", routeId: 0, endDate: "" },
  });

  const joinForm = useForm<z.infer<typeof joinTeamSchema>>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: { inviteCode: "" },
  });

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({ title: "Invite code copied!" });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast({ title: "Failed to copy code", variant: "destructive" });
    }
  };

  const onCreateSubmit = (data: z.infer<typeof createTeamSchema>) => {
    createTeam.mutate({
      data: {
        userId,
        name: data.name,
        routeId: data.routeId,
        endDate: data.endDate,
        today
      }
    }, {
      onSuccess: () => {
        toast({ title: "Team created successfully!" });
        queryClient.invalidateQueries({ queryKey: getGetRunnerProfileQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMoonStateQueryKey() });
        setCreateOpen(false);
        createForm.reset();
      },
      onError: (err: any) => {
        toast({ title: "Failed to create team", description: err?.data?.error || err.message, variant: "destructive" });
      }
    });
  };

  const onJoinSubmit = (data: z.infer<typeof joinTeamSchema>) => {
    joinTeam.mutate({
      data: {
        userId,
        inviteCode: data.inviteCode.toUpperCase(),
      }
    }, {
      onSuccess: () => {
        toast({ title: "Joined team successfully!" });
        queryClient.invalidateQueries({ queryKey: getGetRunnerProfileQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMoonStateQueryKey() });
        setJoinOpen(false);
        joinForm.reset();
      },
      onError: (err: any) => {
        toast({ title: "Failed to join team", description: err?.data?.error || err.message, variant: "destructive" });
      }
    });
  };

  if (isLoading) return <div className="p-8 text-center font-mono text-muted-foreground animate-pulse mt-12">Loading teams...</div>;
  if (isError || !profile) return (
    <div className="p-8 text-center flex flex-col items-center gap-4 mt-12">
      <div className="text-destructive font-mono">Failed to load teams</div>
      <Button onClick={() => refetch()} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
    </div>
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3 mb-6 mt-4">
        <Users className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold font-mono tracking-tight uppercase text-primary">My Teams</h1>
      </div>

      <div className="flex gap-3">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex-1 rounded-2xl shadow-lg shadow-primary/20 font-bold h-12" size="lg">
              <Plus className="w-5 h-5 mr-2" /> Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-tight">Create a New Team</DialogTitle>
              <DialogDescription>Pick a route and an end date for your team challenge.</DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField control={createForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Team Name</FormLabel>
                    <FormControl><Input className="h-12 rounded-xl" placeholder="Apollo 11" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="routeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Route</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={String(field.value) || undefined}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Select a route" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {profile.routes.map(r => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.emoji} {r.name} ({r.totalMiles} mi)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Target End Date</FormLabel>
                    <FormControl><Input type="date" className="h-12 rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full h-12 rounded-xl mt-2 font-bold" disabled={createTeam.isPending}>
                  {createTeam.isPending ? "Creating..." : "Launch Team"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1 rounded-2xl border-2 border-primary/20 font-bold h-12 hover:bg-primary/5" size="lg">
              Join with Code
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-tight">Join a Team</DialogTitle>
              <DialogDescription>Enter the 6-character invite code from your friend.</DialogDescription>
            </DialogHeader>
            <Form {...joinForm}>
              <form onSubmit={joinForm.handleSubmit(onJoinSubmit)} className="space-y-4 mt-2">
                <FormField control={joinForm.control} name="inviteCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Invite Code</FormLabel>
                    <FormControl><Input className="h-14 rounded-xl text-center text-2xl font-mono uppercase tracking-widest font-black" placeholder="ABCDEF" maxLength={6} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full h-12 rounded-xl font-bold" disabled={joinTeam.isPending}>
                  {joinTeam.isPending ? "Joining..." : "Join Team"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4 mt-8">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Active Rosters</h2>
        {profile.teams.length === 0 ? (
          <div className="text-center p-8 bg-muted/30 rounded-3xl border border-dashed border-border/60">
            <Rocket className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground font-medium">You aren't in any active teams.</p>
          </div>
        ) : (
          profile.teams.map(team => {
            const route = profile.routes.find(r => r.id === team.routeId);
            return (
              <Card key={team.id} className="overflow-hidden border-primary/10 shadow-lg shadow-primary/5 rounded-2xl transition-transform active:scale-[0.98]">
                <CardHeader className="pb-3 bg-card relative z-10">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-black font-sans flex items-center gap-3">
                      <span className="text-3xl drop-shadow-sm">{route?.emoji}</span> {team.name}
                    </CardTitle>
                    <button 
                      onClick={(e) => { e.preventDefault(); handleCopy(team.inviteCode); }} 
                      className="bg-primary/10 hover:bg-primary/20 active:bg-primary/30 text-primary px-3 py-1.5 rounded-full text-sm font-bold font-mono tracking-widest flex items-center gap-2 transition-colors border border-primary/20"
                    >
                      {team.inviteCode}
                      {copiedCode === team.inviteCode ? <CheckCircle size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <CardDescription className="font-mono text-xs uppercase tracking-wider mt-2 font-bold text-muted-foreground">
                    Target Date: <span className="text-foreground">{new Date(team.endDate).toLocaleDateString()}</span>
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-3 pb-3 bg-muted/30 border-t border-border/50">
                   <Link href={`/competition`} className="text-primary text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 hover:underline w-full justify-center">
                     <LinkIcon size={14} /> View Global Leaderboard
                   </Link>
                </CardFooter>
              </Card>
            )
          })
        )}
      </div>
    </div>
  );
}
