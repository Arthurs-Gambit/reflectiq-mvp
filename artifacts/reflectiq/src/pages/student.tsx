import { useState } from "react";
import { useGetFollowupQuestion, useSubmitReflection } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { TOPICS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function StudentFlow() {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState("");
  const [step1Text, setStep1Text] = useState("");
  const [step2Text, setStep2Text] = useState("");
  const [step3Text, setStep3Text] = useState("");
  const [followupQuestion, setFollowupQuestion] = useState("");
  
  const { toast } = useToast();

  const getFollowup = useGetFollowupQuestion();
  const submitReflection = useSubmitReflection();

  const handleStep1Submit = async () => {
    if (!topic || !step1Text.trim()) return;
    try {
      const res = await getFollowup.mutateAsync({ data: { topic, step1Text } });
      setFollowupQuestion(res.question);
      setStep(2);
    } catch (e) {
      toast({ title: "Error", description: "Could not generate follow-up question.", variant: "destructive" });
    }
  };

  const handleStep2Submit = () => {
    if (!step2Text.trim()) return;
    setStep(3);
  };

  const handleStep3Submit = async () => {
    if (!step3Text.trim()) return;
    try {
      await submitReflection.mutateAsync({ data: { topic, step1Text, step2Text, step3Text } });
      setStep(4);
    } catch (e) {
      toast({ title: "Error", description: "Failed to submit reflection.", variant: "destructive" });
    }
  };

  if (step === 4) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-lg text-center border-none shadow-xl animate-in zoom-in-95 duration-500">
          <CardHeader className="pt-10">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-3xl font-bold" data-testid="text-success-title">Reflection Complete</CardTitle>
            <CardDescription className="text-lg mt-2" data-testid="text-success-desc">
              Your insights have been securely anonymized and aggregated. Thank you for helping improve this course.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center pb-10 mt-6">
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full" data-testid="button-return-home">Return Home</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background p-6 flex flex-col items-center pt-24">
      <div className="w-full max-w-2xl mb-8 animate-in fade-in duration-500">
        <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 p-4 rounded-lg flex gap-4 items-start border border-blue-200 dark:border-blue-900" data-testid="text-disclosure">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            Your response is anonymized and used only to improve class-level instruction — not to evaluate you individually.
          </p>
        </div>
      </div>

      <Card className="w-full max-w-2xl shadow-lg border-border animate-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="bg-muted/30 border-b border-border pb-6">
          <div className="flex justify-between items-center mb-2">
            <CardDescription className="font-mono uppercase tracking-wider text-xs font-semibold text-primary">
              Step {step} of 3
            </CardDescription>
            <div className="flex gap-1" data-testid="progress-indicators">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-1.5 w-8 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
              ))}
            </div>
          </div>
          
          {step === 1 && (
            <CardTitle className="text-2xl" data-testid="text-step1-question">What did you learn from this topic?</CardTitle>
          )}
          {step === 2 && (
            <CardTitle className="text-2xl text-primary leading-tight" data-testid="text-step2-question">
              {followupQuestion}
            </CardTitle>
          )}
          {step === 3 && (
            <CardTitle className="text-2xl" data-testid="text-step3-question">
              Why does this concept matter, and how would you apply it to a real business or technology case?
            </CardTitle>
          )}
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Select Topic</label>
                <Select value={topic} onValueChange={setTopic}>
                  <SelectTrigger data-testid="select-topic">
                    <SelectValue placeholder="Choose a topic..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TOPICS.map(t => (
                      <SelectItem key={t} value={t} data-testid={`select-item-${t.replace(/\s+/g, '-').toLowerCase()}`}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Your reflection</label>
                <Textarea 
                  className="min-h-[160px] resize-y text-base p-4"
                  placeholder="Share your initial thoughts and uncertainties..."
                  value={step1Text}
                  onChange={(e) => setStep1Text(e.target.value)}
                  data-testid="input-step1"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Textarea 
                className="min-h-[160px] resize-y text-base p-4"
                placeholder="Elaborate on your previous answer..."
                value={step2Text}
                onChange={(e) => setStep2Text(e.target.value)}
                data-testid="input-step2"
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <Textarea 
                className="min-h-[160px] resize-y text-base p-4"
                placeholder="Describe a practical application..."
                value={step3Text}
                onChange={(e) => setStep3Text(e.target.value)}
                data-testid="input-step3"
              />
            </div>
          )}
        </CardContent>
        
        <CardFooter className="bg-muted/10 border-t border-border pt-6 flex justify-end">
          {step === 1 && (
            <Button 
              size="lg" 
              onClick={handleStep1Submit} 
              disabled={!topic || !step1Text.trim() || getFollowup.isPending}
              data-testid="button-next-step1"
            >
              {getFollowup.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Continue
            </Button>
          )}
          {step === 2 && (
            <Button 
              size="lg" 
              onClick={handleStep2Submit} 
              disabled={!step2Text.trim()}
              data-testid="button-next-step2"
            >
              Continue
            </Button>
          )}
          {step === 3 && (
            <Button 
              size="lg" 
              onClick={handleStep3Submit} 
              disabled={!step3Text.trim() || submitReflection.isPending}
              data-testid="button-submit"
            >
              {submitReflection.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Reflection
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
