import { Link } from "wouter";
import { ArrowRight, Moon, Rocket, Users, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden flex flex-col font-sans">
      <header className="px-6 py-5 flex items-center justify-between z-10 relative">
        <div className="font-bold text-xl tracking-tight flex items-center gap-2 text-foreground">
          <span className="text-primary text-2xl drop-shadow-md">🌙</span> Run to the Moon
        </div>
        <div className="flex gap-3">
          <Link href="/sign-in">
            <Button variant="ghost" className="font-bold rounded-full text-foreground hover:bg-secondary/10">Log In</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 py-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] right-[-5%] w-[80vw] max-w-[500px] aspect-square rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[90vw] max-w-[600px] aspect-square rounded-full bg-secondary/5 blur-[120px]" />
        </div>

        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 text-xs font-bold uppercase tracking-widest text-secondary mx-auto">
            <Rocket size={14} className="text-primary" /> The Ultimate Running Challenge
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-black tracking-tighter leading-[1.1] text-foreground">
            Make every mile <br/>
            <span className="text-gradient">matter.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground font-medium leading-relaxed max-w-sm mx-auto">
            Join your team in a collaborative journey. Pool your miles together and run the distance to the Moon. No shame. No solo pressure.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 rounded-2xl text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/25 transition-transform active:scale-95 flex gap-2">
                Start Your Journey <ArrowRight size={20} />
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="w-full max-w-md mt-20 grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both">
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-start gap-4">
            <div className="bg-primary/10 text-primary p-3 rounded-2xl">
              <Users size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Shared Effort</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Everyone's miles go into the same pool. Miss a day? Your team has your back.</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-start gap-4">
            <div className="bg-primary/10 text-primary p-3 rounded-2xl">
              <Moon size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Epic Scale</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Visualize your team's collective progress on massive scale journeys.</p>
            </div>
          </div>
          
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-start gap-4">
            <div className="bg-primary/10 text-primary p-3 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Secure & Private</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Your data is safe, securely authenticated, and completely yours.</p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="py-8 text-center text-sm font-medium text-muted-foreground z-10 relative">
        © {new Date().getFullYear()} Run to the Moon
      </footer>
    </div>
  );
}