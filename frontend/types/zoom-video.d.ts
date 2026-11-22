import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "video-player-container": DetailedHTMLProps<
        HTMLAttributes<HTMLDivElement>,
        HTMLDivElement
      >;
    }
  }
}
