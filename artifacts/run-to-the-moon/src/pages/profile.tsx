import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useGetMoonState, getGetMoonStateQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Stamp, Activity, BarChart2 } from "lucide-react";

export default function Profile() {
  const { userId } = useUser();
  const today = formatDate(new Date());
  
  const { data: moonState } = useGetMoonState(
    { userId, today },
    { query: { queryKey: getGetMoonStateQueryKey({ userId, today }) } }
  );

  const user = moonState?.users.find(u => u.id === userId);

  return (
    <div className="p-5 space-y-6 animate-in fade-in duration-500 mt-4">
      <div className="flex items-center gap-4 bg-card p-6 rounded-3xl border border-border shadow-sm">
         <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-3xl shadow-inner">
           {user?.avatarEmoji || "🏃"}
         </div>
         <div>
           <h1 className="text-2xl font-bold font-mono text-foreground">{user?.name || "Runner"}</h1>
           <p className="text-muted-foreground font-medium text-sm uppercase tracking-wider">Runner Profile</p>
         </div>
      </div>
      
      <div className="flex flex-col gap-3">
        <Link href="/passport" className="flex items-center gap-4 p-5 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
          <div className="p-3 bg-primary/10 rounded-xl text-primary"><Stamp size={24} /></div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground">Passport</h3>
            <p className="text-sm text-muted-foreground">View your stamped locations</p>
          </div>
        </Link>
        <Link href="/activity" className="flex items-center gap-4 p-5 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
          <div className="p-3 bg-primary/10 rounded-xl text-primary"><Activity size={24} /></div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground">Activity Profile</h3>
            <p className="text-sm text-muted-foreground">Daily miles, commutes, and scheduled runs</p>
          </div>
        </Link>
        <Link href="/stats" className="flex items-center gap-4 p-5 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
          <div className="p-3 bg-primary/10 rounded-xl text-primary"><BarChart2 size={24} /></div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground">My Stats</h3>
            <p className="text-sm text-muted-foreground">Lifetime miles and records</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
