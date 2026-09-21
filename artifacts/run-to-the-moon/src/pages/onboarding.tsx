import { useState } from "react";
import { Redirect, useLocation } from "wouter";
import { useClaimRunner, useCreateRunnerProfile, useGetAccountStatus, getGetAccountStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Rocket, Key, UserPlus } from "lucide-react";
import { useClerk } from "@clerk/react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";

const claimSchema = z.object({
  claimCode: z.string().min(8, "Claim code must be at least 8 characters").max(32),
});

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  avatarEmoji: z.string().max(16).optional(),
});

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { signOut } = useClerk();
  const { data: accountStatus } = useGetAccountStatus();
  
  const claimMutation = useClaimRunner();
  const createProfileMutation = useCreateRunnerProfile();

  const claimForm = useForm<z.infer<typeof claimSchema>>({
    resolver: zodResolver(claimSchema),
    defaultValues: { claimCode: "" },
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", avatarEmoji: "" },
  });

  const onClaimSubmit = (data: z.infer<typeof claimSchema>) => {
    claimMutation.mutate({ data }, {
      onSuccess: (res) => {
        queryClient.setQueryData(getGetAccountStatusQueryKey(), res);
        setLocation("/app");
      }
    });
  };

  const onProfileSubmit = (data: z.infer<typeof profileSchema>) => {
    // Automatically generate 1-2 letter initials if avatar is not provided
    const initials = data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "?";
    
    createProfileMutation.mutate({ 
      data: { 
        name: data.name, 
        avatarEmoji: data.avatarEmoji || initials 
      } 
    }, {
      onSuccess: (res) => {
        queryClient.setQueryData(getGetAccountStatusQueryKey(), res);
        setLocation("/app");
      }
    });
  };

  if (accountStatus?.provisioned) {
    return <Redirect to="/app" />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="font-bold text-xl tracking-tight flex items-center gap-2 text-foreground">
          Run to the Moon
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground font-bold rounded-xl hover:text-foreground">
          <LogOut size={16} className="mr-2" /> Sign Out
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-primary/10 text-primary w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-inner">
            <Rocket size={32} />
          </div>
          
          <h1 className="text-3xl font-black tracking-tight text-center mb-2">Welcome aboard</h1>
          <p className="text-center text-muted-foreground font-medium mb-8">
            Set up your runner profile to begin your journey.
          </p>

          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/20 p-1 rounded-2xl">
              <TabsTrigger value="create" className="rounded-xl font-bold tracking-wide text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"><UserPlus size={16} className="mr-2"/> New Runner</TabsTrigger>
              <TabsTrigger value="claim" className="rounded-xl font-bold tracking-wide text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"><Key size={16} className="mr-2"/> Claim Code</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-card border border-border p-6 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-5">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Name</Label>
                          <FormControl>
                            <Input placeholder="e.g. Neil Armstrong" className="h-14 rounded-xl bg-input border-transparent px-4 font-semibold text-lg focus-visible:ring-primary" {...field} />
                          </FormControl>
                          <FormMessage className="text-destructive font-medium" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="avatarEmoji"
                      render={({ field }) => (
                        <FormItem>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Initials or Tag (Optional)</Label>
                          <FormControl>
                            <Input placeholder="NA" maxLength={2} className="h-14 rounded-xl bg-input border-transparent px-4 font-semibold text-lg focus-visible:ring-primary w-24 text-center" {...field} />
                          </FormControl>
                          <FormMessage className="text-destructive font-medium" />
                          <p className="text-xs text-muted-foreground font-medium mt-2">Leave blank to use your name's initials.</p>
                        </FormItem>
                      )}
                    />

                    {createProfileMutation.isError && (
                      <Alert variant="destructive" className="rounded-xl border-destructive/50 bg-destructive/10">
                        <AlertDescription className="font-medium text-destructive">
                          {(createProfileMutation.error as any)?.message || "Failed to create profile. Please try again."}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full h-14 rounded-xl font-bold text-lg shadow-sm" 
                      disabled={createProfileMutation.isPending}
                    >
                      {createProfileMutation.isPending ? "Creating..." : "Start Journey"}
                    </Button>
                  </form>
                </Form>
              </div>
            </TabsContent>
            
            <TabsContent value="claim" className="animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-card border border-border p-6 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
                <p className="text-sm font-medium text-muted-foreground mb-6 leading-relaxed">
                  If you previously ran without an account or received an invite from a team captain, enter your claim code here to link your progress.
                </p>
                
                <Form {...claimForm}>
                  <form onSubmit={claimForm.handleSubmit(onClaimSubmit)} className="space-y-5">
                    <FormField
                      control={claimForm.control}
                      name="claimCode"
                      render={({ field }) => (
                        <FormItem>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Claim Code</Label>
                          <FormControl>
                            <Input 
                              placeholder="e.g. MOON-A1B2C3D4" 
                              className="h-14 rounded-xl bg-input border-transparent px-4 font-mono font-bold text-lg tracking-widest focus-visible:ring-primary uppercase" 
                              {...field} 
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormMessage className="text-destructive font-medium" />
                        </FormItem>
                      )}
                    />

                    {claimMutation.isError && (
                      <Alert variant="destructive" className="rounded-xl border-destructive/50 bg-destructive/10">
                        <AlertDescription className="font-medium text-destructive">
                          {(claimMutation.error as any)?.message || "Invalid or expired claim code."}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full h-14 rounded-xl font-bold text-lg shadow-sm"
                      disabled={claimMutation.isPending}
                    >
                      {claimMutation.isPending ? "Verifying..." : "Link Profile"}
                    </Button>
                  </form>
                </Form>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}