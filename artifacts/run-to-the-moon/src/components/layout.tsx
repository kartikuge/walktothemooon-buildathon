import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useGetMoonState, getGetMoonStateQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Trophy, Compass, Plus, Stamp as StampIcon, Menu, X } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { userId, switchUser } = useUser();
  const today = formatDate(new Date());
  
  const { data: moonState } = useGetMoonState(
    { userId, today },
    { query: { queryKey: getGetMoonStateQueryKey({ userId, today }), refetchInterval: 10000 } }
  );

  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto bg-background shadow-2xl overflow-hidden relative">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight text-foreground flex items-center gap-2">
          🌙 <span className="hidden sm:inline">Run to the Moon</span>
        </Link>
        
        {moonState && (
          <div className="flex items-center gap-1">
            <select 
              className="bg-secondary text-foreground text-sm font-bold rounded-full px-3 py-1.5 border-none outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer pr-8 relative"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231a202c%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
              value={String(userId)} 
              onChange={(e) => switchUser(Number(e.target.value))}
            >
              {moonState.users.map(u => (
                <option key={u.id} value={String(u.id)}>
                  {u.avatarEmoji} {u.name}
                </option>
              ))}
            </select>
            
            <button 
              onClick={() => setMenuOpen(!menuOpen)} 
              className="p-2 text-foreground relative z-50 rounded-full hover:bg-secondary transition-colors"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-14 right-4 bg-card border border-border shadow-2xl rounded-2xl p-2 flex flex-col gap-1 z-50 animate-in slide-in-from-top-4 fade-in duration-200 min-w-[180px]">
                  <Link href="/teams" onClick={() => setMenuOpen(false)} className="px-4 py-3 font-bold font-mono text-sm uppercase hover:bg-secondary rounded-xl transition-colors flex items-center">My Teams</Link>
                  <Link href="/planner" onClick={() => setMenuOpen(false)} className="px-4 py-3 font-bold font-mono text-sm uppercase hover:bg-secondary rounded-xl transition-colors flex items-center">Route Planner</Link>
                  <Link href="/stats" onClick={() => setMenuOpen(false)} className="px-4 py-3 font-bold font-mono text-sm uppercase hover:bg-secondary rounded-xl transition-colors flex items-center">My Stats</Link>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      <main key={userId} className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 w-full max-w-md bg-background border-t border-border flex items-center justify-around py-3 pb-6 z-50">
        <Link href="/" className={`flex flex-col items-center gap-1 ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}>
          <Compass size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </Link>
        <Link href="/competition" className={`flex flex-col items-center gap-1 ${location === '/competition' ? 'text-primary' : 'text-muted-foreground'}`}>
          <Trophy size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Compete</span>
        </Link>
        <Link href="/log" className={`flex flex-col items-center gap-1 ${location === '/log' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className="bg-primary text-primary-foreground p-3 rounded-full -mt-8 shadow-lg shadow-primary/30 border-4 border-background active:scale-95 transition-transform">
            <Plus size={24} strokeWidth={3} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Log Run</span>
        </Link>
        <Link href="/passport" className={`flex flex-col items-center gap-1 ${location === '/passport' ? 'text-primary' : 'text-muted-foreground'}`}>
          <StampIcon size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Passport</span>
        </Link>
      </nav>
    </div>
  );
}