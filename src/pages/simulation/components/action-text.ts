import { SimActionView, SimFault } from '../api/simulation.api';
import { ACTION_KIND_LABEL, controlOf, controlValueText, tagOf } from '../simulation.catalog';
import { durationText, offsetText } from './job-bits';

const faultText = (catalog: SimFault[] | undefined, kind: string | null | undefined) =>
  catalog?.find((f) => f.kind === kind)?.label ?? kind ?? 'fault';

const intensityText = (catalog: SimFault[] | undefined, a: SimActionView) => {
  if (a.value === null || a.value === undefined) return '';
  const unit = catalog?.find((f) => f.kind === a.fault)?.unit;
  return ` at ${a.value}${unit ? ` ${unit}` : ''}`;
};

/** What an action does: "CHW Supply Set Point → 7.5 °C", "Trip for 30 min" */
export const actionWhat = (a: SimActionView, catalog?: SimFault[]) => {
  const duration = a.duration_min ? ` for ${durationText(a.duration_min)}` : '';
  let what: string;
  switch (a.kind) {
    case 'control': {
      const control = controlOf(a.asset, a.param);
      what = `${control?.label ?? a.param ?? 'control'} → ${controlValueText(control, a.value)}${
        a.duration_min ? `, reverted after ${durationText(a.duration_min)}` : ''
      }`;
      break;
    }
    case 'fault':
      what = `Inject ${faultText(catalog, a.fault)}${intensityText(catalog, a)}${duration}`;
      break;
    case 'clear_fault':
      what = `Clear ${faultText(catalog, a.fault)}`;
      break;
    case 'offline':
      what = `Communication loss${duration}`;
      break;
    case 'maintenance':
      what = `Maintenance${duration || ' until released'}`;
      break;
    case 'release':
      what = 'Released from maintenance';
      break;
    case 'trip':
      what = `Trip${duration}`;
      break;
    default:
      what = ACTION_KIND_LABEL[a.kind as keyof typeof ACTION_KIND_LABEL] ?? a.kind;
  }
  return what;
};

/** "+0:30 · CHWS-01 · CHW Supply Set Point → 7.5 °C" */
export const describeAction = (a: SimActionView, catalog?: SimFault[]) =>
  `${offsetText(a.at_min)} · ${tagOf(a.asset)} · ${actionWhat(a, catalog)}`;
