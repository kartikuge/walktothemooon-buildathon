import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useGetMoonState, getGetMoonStateQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { Trophy, Compass, Plus, Menu, X, User, Map, Users } from "lucide-react";

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
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border px-5 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight text-foreground flex items-center gap-2">
          🌙 <span className="hidden sm:inline">Run to the Moon</span>
        </Link>
        
        {moonState && (
          <div className="flex items-center gap-2">
            <select 
              className="bg-secondary text-foreground text-sm font-bold rounded-full px-4 py-2 border-none outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer pr-9 relative"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231a202c%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.8rem top 50%', backgroundSize: '0.65rem auto' }}
              value={String(userId)} 
              onChange={(e) => switchUser(Number(e.target.value))}
              aria-label="Switch runner"
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
              aria-label="More navigation"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-16 right-4 bg-card border border-border shadow-2xl rounded-2xl p-2 flex flex-col gap-1 z-50 animate-in slide-in-from-top-4 fade-in duration-200 min-w-[200px]">
                  <Link href="/competition" onClick={() => setMenuOpen(false)} className="px-4 py-3 font-bold font-sans text-sm hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"><Trophy size={16} /> Compete</Link>
                  <Link href="/planner" onClick={() => setMenuOpen(false)} className="px-4 py-3 font-bold font-sans text-sm hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"><Map size={16} /> Route Planner</Link>
                  <Link href="/passport" onClick={() => setMenuOpen(false)} className="px-4 py-3 font-bold font-sans text-sm hover:bg-secondary rounded-xl transition-colors flex items-center gap-3"><User size={16} /> Passport</Link>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      <main key={userId} className="flex-1 overflow-y-auto pb-28">
        {children}
      </main>

      <nav className="fixed bottom-0 w-full max-w-md bg-background border-t border-border flex items-center justify-around py-2 pb-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <Link href="/" className={`flex flex-col items-center justify-center min-w-[50px] min-h-[50px] gap-1 ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`} aria-current={location === '/' ? 'page' : undefined}>
          <Compass size={22} strokeWidth={location === '/' ? 2.5 : 2} />
          <span className="text-[10px] font-bold tracking-wide">Home</span>
        </Link>
        <Link href="/maps/add" className={`flex flex-col items-center justify-center min-w-[50px] min-h-[50px] gap-1 ${location === '/maps/add' ? 'text-primary' : 'text-muted-foreground'}`} aria-current={location === '/maps/add' ? 'page' : undefined}>
          <Map size={22} strokeWidth={location === '/maps/add' ? 2.5 : 2} />
          <span className="text-[10px] font-bold tracking-wide">Maps</span>
        </Link>
        <Link href="/log" className={`flex flex-col items-center justify-center min-w-[60px] min-h-[60px] ${location === '/log' ? 'text-primary' : 'text-muted-foreground'}`} aria-current={location === '/log' ? 'page' : undefined}>
          <div className="bg-primary text-primary-foreground p-4 rounded-full -mt-10 shadow-lg shadow-primary/30 border-4 border-background active:scale-95 transition-transform hover:shadow-primary/50 hover:-translate-y-1">
            <Plus size={24} strokeWidth={3} />
          </div>
          <span className="text-[10px] font-bold tracking-wide mt-1.5">Log Run</span>
        </Link>
        <Link href="/teams" className={`flex flex-col items-center justify-center min-w-[50px] min-h-[50px] gap-1 ${location === '/teams' ? 'text-primary' : 'text-muted-foreground'}`} aria-current={location === '/teams' ? 'page' : undefined}>
          <Users size={22} strokeWidth={location === '/teams' ? 2.5 : 2} />
          <span className="text-[10px] font-bold tracking-wide">Teams</span>
        </Link>
        <Link href="/profile" className={`flex flex-col items-center justify-center min-w-[50px] min-h-[50px] gap-1 ${['/profile', '/passport', '/activity', '/stats'].includes(location) ? 'text-primary' : 'text-muted-foreground'}`} aria-current={['/profile', '/passport', '/activity', '/stats'].includes(location) ? 'page' : undefined}>
          <User size={22} strokeWidth={['/profile', '/passport', '/activity', '/stats'].includes(location) ? 2.5 : 2} />
          <span className="text-[10px] font-bold tracking-wide">Profile</span>
        </Link>
      </nav>
    </div>
  );
}