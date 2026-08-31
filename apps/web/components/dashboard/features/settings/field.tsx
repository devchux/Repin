import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";

export function Field({
  label,
  ...props
}: React.ComponentProps<typeof Input> & { readonly label: string }) {
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="mt-2 shadow-none" {...props} />
    </div>
  );
}
