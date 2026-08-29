import { ComponentType, SVGProps } from "react";

export type StatusPresentation = {
  readonly label: string;
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly className: string;
  readonly spin: boolean;
};