import { Link, useLocation } from "wouter";

export default function Completion() {
  // We need to parse search from window.location.search directly since wouter's hook mainly handles path.
  const params = new URLSearchParams(window.location.search);
  
  const miles = params.get('miles') || '0';
  const moon = params.get('moon') || '0';
  const route = params.get('route') || 'Unknown Route';
  const emoji = params.get('emoji') || '🏁';

  return (
    <div className="fixed inset-0 z-[100] bg-moon-gradient text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-700">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-30 mix-blend-overlay"></div>
      
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <div className="text-9xl mb-8 animate-in zoom-in duration-1000 delay-300 drop-shadow-2xl animate-[bounce_2s_infinite]">
          {emoji}
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight mb-3 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-blue-200">
          Stamp added to your passport!
        </h1>
        
        <p className="text-lg font-medium text-white/80 mb-10 bg-black/20 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
          Route Complete: {route}
        </p>
        
        <div className="bg-white/10 backdrop-blur-xl px-8 py-6 rounded-3xl border border-white/20 shadow-2xl mb-12 w-full animate-in slide-in-from-bottom-8 duration-700 delay-500">
          <div className="text-5xl font-mono font-bold text-accent mb-2 filter drop-shadow-[0_0_8px_rgba(255,165,0,0.5)]">
            +{Number(miles).toFixed(1)} <span className="text-2xl">mi</span>
          </div>
          <div className="text-sm font-bold uppercase tracking-widest text-white/90">
            to the Moon
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="text-xs text-white/60 uppercase tracking-widest font-bold mb-1">Global Moon Progress</div>
            <div className="text-xl font-mono">{Number(moon).toLocaleString()} <span className="text-sm">mi</span></div>
          </div>
        </div>
        
        <Link 
          href="/app/passport" 
          className="bg-white text-background px-8 py-4 rounded-2xl font-bold text-lg w-full shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all duration-300"
        >
          View Passport
        </Link>
      </div>
    </div>
  );
}
