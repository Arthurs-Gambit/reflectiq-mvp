import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, BrainCircuit } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-6">
      <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 p-4 rounded-2xl">
            <BrainCircuit className="w-12 h-12 text-primary" />
          </div>
        </div>
        
        <h1 className="text-5xl font-bold tracking-tight text-foreground" data-testid="text-app-name">
          ReflectIQ
        </h1>
        
        <p className="text-xl text-muted-foreground font-medium" data-testid="text-tagline">
          Where raw student uncertainty becomes actionable faculty intelligence.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Link href="/student" className="w-full" data-testid="link-student">
            <Button size="lg" className="w-full h-24 text-lg font-semibold rounded-xl bg-card text-card-foreground border-2 border-border hover:border-primary hover:bg-primary/5 transition-all">
              I'm a Student
            </Button>
          </Link>
          <Link href="/faculty" className="w-full" data-testid="link-faculty">
            <Button size="lg" className="w-full h-24 text-lg font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl">
              I'm Faculty
            </Button>
          </Link>
        </div>

        <div className="pt-16 max-w-md mx-auto">
          <div className="flex items-start gap-3 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg border border-muted" data-testid="text-governance-note">
            <Shield className="w-5 h-5 shrink-0 text-primary mt-0.5" />
            <p className="text-left leading-relaxed">
              <strong>Privacy Preserving by Design.</strong> ReflectIQ strictly aggregates and anonymizes responses. Data is used exclusively to improve class-level instruction, not to evaluate individuals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
