export const parseIsoDateTime = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isPastBookingStart = (value: unknown, now = Date.now()) => {
  const parsed = parseIsoDateTime(value);
  if (!parsed) return true;
  return parsed.getTime() <= now;
};

export const filterFutureSlots = <T extends { slot_time?: string }>(slots: T[], now = Date.now()) =>
  slots.filter((slot) => {
    const slotTime = parseIsoDateTime(slot?.slot_time);
    return slotTime ? slotTime.getTime() > now : false;
  });
