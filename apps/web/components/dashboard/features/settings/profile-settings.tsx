"use client";

import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { profileSchema, type ProfileFormValues } from "@/schemas/profile";
import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, AvatarFallback } from "@repo/ui/avatar";
import { Button } from "@repo/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import { LoaderCircle, Save } from "@repo/ui/icons";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { SectionHeading } from "./section-heading";
import { EmailSettings } from "./email-settings";

export function ProfileSettings() {
  const profile = useProfile();
  const item = profile.data?.data.data;
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: { firstName: "", lastName: "" },
  });
  const update = useUpdateProfile(item?.id ?? 0, (saved) =>
    form.reset({ firstName: saved.firstName, lastName: saved.lastName }),
  );

  useEffect(() => {
    if (item)
      form.reset({ firstName: item.firstName, lastName: item.lastName });
  }, [form, item]);

  if (profile.isLoading)
    return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  if (profile.isError || !item)
    return (
      <div>
        <p className="text-sm text-destructive">
          Your profile could not be loaded.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => void profile.refetch()}
        >
          Try again
        </Button>
      </div>
    );

  const initials =
    `${item.firstName[0] ?? ""}${item.lastName[0] ?? ""}`.toUpperCase();
  return (
    <>
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit((values) => update.mutate(values))}
        >
          <SectionHeading
            title="Profile"
            description="Personal information associated with your Repin account."
          />
          <div className="mt-6 flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">
                {initials || "R"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {item.firstName} {item.lastName}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Profile photos are not supported yet.
              </p>
            </div>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input maxLength={100} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input maxLength={100} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="mt-8 flex items-center justify-between border-t pt-5">
            <p className="text-xs text-muted-foreground">
              {form.formState.isDirty
                ? "Unsaved profile changes"
                : "Profile is up to date"}
            </p>
            <Button
              type="submit"
              disabled={
                update.isPending ||
                !form.formState.isDirty ||
                !form.formState.isValid
              }
            >
              {update.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Save />
              )}
              {update.isPending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      </Form>
      <EmailSettings currentEmail={item.email} />
    </>
  );
}
