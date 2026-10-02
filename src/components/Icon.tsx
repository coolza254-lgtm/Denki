// Rounded line icons drawn to match the logo's thick strokes.
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { C } from '../theme';

export type IconName =
  | 'home' | 'meter' | 'snow' | 'receipt' | 'chart' | 'gear' | 'left' | 'right' | 'calendar'
  | 'clock' | 'camera' | 'image' | 'plus' | 'check' | 'bolt' | 'download' | 'trash' | 'alert'
  | 'sparkle' | 'share' | 'wallet' | 'backup' | 'bell' | 'key' | 'scan';

export function Icon({ name, size = 24, color = C.ink, fill }: { name: IconName; size?: number; color?: string; fill?: string }) {
  const p = { stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const shape = (() => {
    switch (name) {
      case 'home':
        return <><Path {...p} d="M3.5 11 12 4l8.5 7" /><Path {...p} d="M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" /><Path {...p} fill={fill ?? 'none'} d="m12.6 10-2.4 3.6h3.2L11 17.4" /></>;
      case 'meter':
        return <><Rect {...p} x={4} y={3.5} width={16} height={17} rx={3.5} /><Rect {...p} x={7.5} y={7} width={9} height={4.5} rx={1.2} /><Path {...p} d="M8 15.5h8M9.5 18h5" /></>;
      case 'snow':
        return <><Path {...p} d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" /><Path {...p} d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2" /></>;
      case 'receipt':
        return <><Path {...p} d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" /><Path {...p} d="M9 8.5h6M9 12h6M9 15.5h3.5" /></>;
      case 'chart':
        return <><Path {...p} d="M4 20h16" /><Rect {...p} x={5.5} y={11} width={3.2} height={6} rx={1} /><Rect {...p} x={10.4} y={6} width={3.2} height={11} rx={1} /><Rect {...p} x={15.3} y={13} width={3.2} height={4} rx={1} /></>;
      case 'gear':
        return <><Circle {...p} cx={12} cy={12} r={3} /><Path {...p} d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></>;
      case 'left':
        return <Path {...p} d="m14.5 6-6 6 6 6" />;
      case 'right':
        return <Path {...p} d="m9.5 6 6 6-6 6" />;
      case 'calendar':
        return <><Rect {...p} x={4} y={5} width={16} height={15} rx={3} /><Path {...p} d="M4 10h16M8.5 3v4M15.5 3v4" /></>;
      case 'clock':
        return <><Circle {...p} cx={12} cy={12} r={8.5} /><Path {...p} d="M12 7.5V12l3 2" /></>;
      case 'camera':
        return <><Path {...p} d="M4 8.5a2 2 0 0 1 2-2h2l1.5-2h5L16 6.5h2a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><Circle {...p} cx={12} cy={12.5} r={3.3} /></>;
      case 'image':
        return <><Rect {...p} x={3.5} y={4.5} width={17} height={15} rx={3} /><Circle {...p} cx={9} cy={10} r={1.6} /><Path {...p} d="m4 17 5-4.5 3.5 3 2.5-2 5 4" /></>;
      case 'plus':
        return <Path {...p} d="M12 5v14M5 12h14" />;
      case 'check':
        return <Path {...p} d="m5 12.5 4.5 4.5L19 7.5" />;
      case 'bolt':
        return <Path {...p} fill={fill ?? 'none'} d="M13.5 2.5 5 13.5h6l-1.5 8 8.5-11h-6z" />;
      case 'download':
        return <><Path {...p} d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><Path {...p} d="M5 19.5h14" /></>;
      case 'trash':
        return <><Path {...p} d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></>;
      case 'alert':
        return <><Path {...p} d="M12 4 2.8 19.5h18.4z" /><Path {...p} d="M12 10v4.5M12 17.2v.1" /></>;
      case 'sparkle':
        return <><Path {...p} d="M12 3.5c.6 4 2.5 5.9 6.5 6.5-4 .6-5.9 2.5-6.5 6.5-.6-4-2.5-5.9-6.5-6.5 4-.6 5.9-2.5 6.5-6.5z" /><Path {...p} d="M18.5 16.5v4M16.5 18.5h4" /></>;
      case 'share':
        return <><Path {...p} d="M12 15V3.5M7.5 8 12 3.5 16.5 8" /><Path {...p} d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5" /></>;
      case 'wallet':
        return <><Rect {...p} x={3.5} y={6} width={17} height={13} rx={3} /><Path {...p} d="M16 12.5h4.5M6.5 6l9-2.5 1 2.5" /></>;
      case 'backup':
        return <><Path {...p} d="M7 18.5a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.3 1.6A3.8 3.8 0 0 1 17.5 18.5" /><Path {...p} d="M12 20v-7M9 15.5l3-3 3 3" /></>;
      case 'bell':
        return <><Path {...p} d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" /><Path {...p} d="M10 20.5a2 2 0 0 0 4 0" /></>;
      case 'key':
        return <><Circle {...p} cx={8} cy={14} r={4} /><Path {...p} d="m11 11 8.5-8.5M16 6l2.5 2.5M14 8l2 2" /></>;
      case 'scan':
        return <><Path {...p} d="M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5" /><Path {...p} d="M8 12h8" /></>;
    }
  })();
  return <Svg width={size} height={size} viewBox="0 0 24 24">{shape}</Svg>;
}
