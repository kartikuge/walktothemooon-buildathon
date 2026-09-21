import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  getGetAccountStatusQueryKey,
  getGetMoonStateQueryKey,
  getGetRunnerProfileQueryKey,
  useGetAccountStatus,
  useUpdateRunnerProfile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";
import { Activity, BarChart2, Check, Save, Stamp } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name must be 80 characters or fewer"),
  avatarEmoji: z.string().trim().min(1, "Avatar is required").max(16, "Avatar must be 16 characters or fewer"),
});

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: accountStatus } = useGetAccountStatus();
  const runner = accountStatus?.runner;
  const today = formatDate(new Date());
  const updateProfileMutation = useUpdateRunnerProfile();
  const [saved, setSaved] = useState(false);
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", avatarEmoji: "" },
  });

  useEffect(() => {
    if (!runner) return;
    form.reset({ name: runner.name, avatarEmoji: runner.avatarEmoji });
  }, [form, runner?.id, runner?.name, runner?.avatarEmoji]);

  const onSubmit = (data: z.infer<typeof profileSchema>) => {
    setSaved(false);
    updateProfileMutation.mutate({ data }, {
      onSuccess: (response) => {
        queryClient.setQueryData(getGetAccountStatusQueryKey(), response);
        queryClient.invalidateQueries({ queryKey: getGetMoonStateQueryKey({ today }) });
        queryClient.invalidateQueries({ queryKey: getGetRunnerProfileQueryKey() });
        setSaved(true);
      },
    });
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500 mt-4 pb-28">
      <div className="flex flex-col items-center gap-4 bg-background p-8 rounded-[2.5rem] border border-border shadow-sm text-center">
         <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-5xl shadow-sm">
           {form.watch("avatarEmoji") || "🏃"}
         </div>
         <div>
           <h1 className="text-3xl font-bold text-foreground tracking-tight">{form.watch("name") || "Runner"}</h1>
           <p className="text-primary font-bold text-xs uppercase tracking-widest mt-1 bg-primary/10 px-3 py-1 rounded-full inline-block">Runner Profile</p>
         </div>
      </div>

      <section className="bg-card rounded-3xl border border-border p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-foreground">Edit profile</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">Update the identity your teammates see.</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display name</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={80} placeholder="Your display name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatarEmoji"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={16} placeholder="🏃" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {updateProfileMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>Could not update your profile. Check your details and try again.</AlertDescription>
              </Alert>
            )}
            {saved && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>Your profile was updated.</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full rounded-2xl" disabled={updateProfileMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateProfileMutation.isPending ? "Saving..." : "Save profile"}
            </Button>
          </form>
        </Form>
      </section>
      
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
