import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMoonState, getGetMoonStateQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Trophy, Compass, Plus, Menu, X, User, Map, Users, LogOut } from "lucide-react";
import { useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const today = formatDate(new Date());
  
  const { data: moonState } = useGetMoonState(
    { today },
    { query: { queryKey: getGetMoonStateQueryKey({ today }), refetchInterval: 10000 } }
  );

  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut } = useClerk();

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto bg-background shadow-2xl overflow-hidden relative">
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border px-5 py-4 flex items-center justify-between">
        <Link href="/app" className="font-bold text-xl tracking-tight text-foreground flex items-center gap-2">
          🌙 <span className="hidden sm:inline">Run to the Moon</span>
        </Link>
        
        {moonState && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMenuOpen(!menuOpen)} 
              className="p-2 text-foreground relative z-50 rounded-full hover:bg-secondary transition-colors"
              aria-label="More navigation"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-16 right-4 bg-card border border-border shadow-2xl rounded-2xl p-2 flex flex-col gap-1 z-50 animate-in slide-in-from-top-4 fade-in duration-200 min-w-[200px]">
                  <Link href="/app/competition" onClick={() => setMenuOpen(false)} className="px-4 py-3 font-bold font-sans text-sm hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"><Trophy size={16} /> Compete</Link>
                  <Link href="/app/planner" onClick={() => setMenuOpen(false)} className="px-4 py-3 font-bold font-sans text-sm hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"><Map size={16} /> Route Planner</Link>
                  <Link href="/app/passport" onClick={() => setMenuOpen(false)} className="px-4 py-3 font-bold font-sans text-sm hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"><User size={16} /> Passport</Link>
                  <div className="h-px bg-border my-1" />
                  <button 
                    onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL })}
                    className="px-4 py-3 font-bold font-sans text-sm text-destructive hover:bg-destructive/10 rounded-xl transition-colors flex items-center gap-3 w-full text-left"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto pb-28">
        {children}
      </main>

      <nav className="fixed bottom-0 w-full max-w-md bg-background border-t border-border flex items-center justify-around py-2 pb-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <Link href="/app" className={`flex flex-col items-center justify-center min-w-[50px] min-h-[50px] gap-1 ${location === '/app' ? 'text-primary' : 'text-muted-foreground'}`} aria-current={location === '/app' ? 'page' : undefined}>
          <Compass size={22} strokeWidth={location === '/app' ? 2.5 : 2} />
          <span className="text-[10px] font-bold tracking-wide">Home</span>
        </Link>
        <Link href="/app/maps/add" className={`flex flex-col items-center justify-center min-w-[50px] min-h-[50px] gap-1 ${location === '/app/maps/add' ? 'text-primary' : 'text-muted-foreground'}`} aria-current={location === '/app/maps/add' ? 'page' : undefined}>
          <Map size={22} strokeWidth={location === '/app/maps/add' ? 2.5 : 2} />
          <span className="text-[10px] font-bold tracking-wide">Maps</span>
        </Link>
        <Link href="/app/log" className={`flex flex-col items-center justify-center min-w-[60px] min-h-[60px] ${location === '/app/log' ? 'text-primary' : 'text-muted-foreground'}`} aria-current={location === '/app/log' ? 'page' : undefined}>
          <div className="bg-primary text-primary-foreground p-4 rounded-full -mt-10 shadow-lg shadow-primary/30 border-4 border-background active:scale-95 transition-transform hover:shadow-primary/50 hover:-translate-y-1">
            <Plus size={24} strokeWidth={3} />
          </div>
          <span className="text-[10px] font-bold tracking-wide mt-1.5">Log Run</span>
        </Link>
        <Link href="/app/teams" className={`flex flex-col items-center justify-center min-w-[50px] min-h-[50px] gap-1 ${location === '/app/teams' ? 'text-primary' : 'text-muted-foreground'}`} aria-current={location === '/app/teams' ? 'page' : undefined}>
          <Users size={22} strokeWidth={location === '/app/teams' ? 2.5 : 2} />
          <span className="text-[10px] font-bold tracking-wide">Teams</span>
        </Link>
        <Link href="/app/profile" className={`flex flex-col items-center justify-center min-w-[50px] min-h-[50px] gap-1 ${['/app/profile', '/app/passport', '/app/activity', '/app/stats'].includes(location) ? 'text-primary' : 'text-muted-foreground'}`} aria-current={['/app/profile', '/app/passport', '/app/activity', '/app/stats'].includes(location) ? 'page' : undefined}>
          <User size={22} strokeWidth={['/app/profile', '/app/passport', '/app/activity', '/app/stats'].includes(location) ? 2.5 : 2} />
          <span className="text-[10px] font-bold tracking-wide">Profile</span>
        </Link>
      </nav>
    </div>
  );
}