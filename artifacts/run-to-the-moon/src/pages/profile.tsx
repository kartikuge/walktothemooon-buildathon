import { Link } from "wouter";
import { useGetAccountStatus, useGetMoonState, getGetMoonStateQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Stamp, Activity, BarChart2 } from "lucide-react";

export default function Profile() {
  const { data: accountStatus } = useGetAccountStatus();
    const today = formatDate(new Date());
  
  const { data: moonState } = useGetMoonState(
    { today },
    { query: { queryKey: getGetMoonStateQueryKey({ today }) } }
  );

  const user = moonState?.users.find(u => u.id === accountStatus?.runner?.id);

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500 mt-4 pb-28">
      <div className="flex flex-col items-center gap-4 bg-background p-8 rounded-[2.5rem] border border-border shadow-sm text-center">
         <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-5xl shadow-sm">
           {user?.avatarEmoji || "🏃"}
         </div>
         <div>
           <h1 className="text-3xl font-bold text-foreground tracking-tight">{user?.name || "Runner"}</h1>
           <p className="text-primary font-bold text-xs uppercase tracking-widest mt-1 bg-primary/10 px-3 py-1 rounded-full inline-block">Runner Profile</p>
         </div>
      </div>
      
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest ml-2 mb-1">Your Journey</h2>
        <Link href="/app/passport" className="flex items-center gap-4 p-5 bg-card rounded-3xl border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
          <div className="p-3.5 bg-primary rounded-2xl text-primary-foreground shadow-sm shadow-primary/30"><Stamp size={24} /></div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground">Passport</h3>
            <p className="text-sm font-medium text-muted-foreground">View your stamped locations</p>
          </div>
        </Link>
        <Link href="/app/activity" className="flex items-center gap-4 p-5 bg-card rounded-3xl border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
          <div className="p-3.5 bg-primary rounded-2xl text-primary-foreground shadow-sm shadow-primary/30"><Activity size={24} /></div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground">Activity Profile</h3>
            <p className="text-sm font-medium text-muted-foreground">Schedule & running routine</p>
          </div>
        </Link>
        <Link href="/app/stats" className="flex items-center gap-4 p-5 bg-card rounded-3xl border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
          <div className="p-3.5 bg-primary rounded-2xl text-primary-foreground shadow-sm shadow-primary/30"><BarChart2 size={24} /></div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground">My Stats</h3>
            <p className="text-sm font-medium text-muted-foreground">Lifetime miles and records</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
