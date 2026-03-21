declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  export type Icon = FC<IconProps>;
  export const Sparkles: Icon;
  export const Camera: Icon;
  export const Instagram: Icon;
  export const Facebook: Icon;
  export const MessageCircle: Icon;
  export const Send: Icon;
  export const ArrowLeft: Icon;
  export const Share2: Icon;
  export const Check: Icon;
  export const X: Icon;
  export const Menu: Icon;
  export const User: Icon;
}
