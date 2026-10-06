import type { Tone } from '@/components/ui';

/** Статусы доставки заявки: подпись и цвет. */
export const LEAD_STATUS: Record<string, [string, Tone]> = {
  received: ['доставляется', 'blue'],
  delivered: ['доставлена', 'green'],
  partial: ['частично', 'amber'],
  failed: ['не доставлена', 'red'],
};
