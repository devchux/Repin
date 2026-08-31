import { Avatar, AvatarFallback } from "@repo/ui/avatar";
import { Button } from "@repo/ui/button";
import { Field } from "./field";
import { SectionHeading } from "./section-heading";

export function ProfileSettings() {
  return (
    <>
      <SectionHeading
        title="Profile"
        description="Personal information shown across your Repin workspace."
      />
      <div className="mt-6 flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarFallback className="text-lg">CO</AvatarFallback>
        </Avatar>
        <div>
          <Button variant="outline" size="sm">
            Change photo
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            JPG, PNG, or WebP. 2 MB max.
          </p>
        </div>
      </div>
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field label="Full name" defaultValue="Chukwudi Onwuma" />
        <Field
          label="Email address"
          type="email"
          defaultValue="chukwudi@example.com"
        />
        <div className="sm:col-span-2">
          <Field label="Workspace name" defaultValue="Chukwudi's workspace" />
        </div>
      </div>
    </>
  );
}
