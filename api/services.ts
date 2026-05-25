import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase.js';
import { scheduleNotification } from './_lib/qstash.js';
import { Telegraf } from 'telegraf';
import { validateTelegramWebAppData, getUserFromInitData } from './_lib/telegram-auth.js';
import { filterFutureSlots, isPastBookingStart } from './_lib/booking-time.js';
import type Stripe from 'stripe';

type TelegramAuthUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

const isDevelopment = process.env.NODE_ENV === 'development';

const getTelegramId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const getErrorMessage = (err: unknown) => err instanceof Error ? err.message : 'Unexpected server error';
const missingDescriptionColumnError = (err: unknown) => {
  const message = getErrorMessage(err).toLowerCase();
  return message.includes('description') && (message.includes('column') || message.includes('schema cache'));
};

const dayBounds = (date: string) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
};

const monthBounds = (date: string) => {
  const selected = new Date(date);
  const start = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const end = new Date(selected.getFullYear(), selected.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
};

const distanceKm = (
  a?: { lat?: number; lng?: number },
  b?: { lat?: number | null; lng?: number | null }
) => {
  if (!a?.lat || !a?.lng || !b?.lat || !b?.lng) return null;
  const toRad = (value: number) => value * Math.PI / 180;
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const subscriptionPlans = {
  essential: { name: 'BeautyOS Essential', priceIls: 29, envPriceId: 'STRIPE_PRICE_ID_ESSENTIAL' },
  pro: { name: 'BeautyOS Pro Master', priceIls: 69, envPriceId: 'STRIPE_PRICE_ID_PRO' },
  elite: { name: 'BeautyOS Elite Partner', priceIls: 149, envPriceId: 'STRIPE_PRICE_ID_ELITE' },
} as const;

const getPublicAppUrl = (req: VercelRequest) => {
  const configuredUrl = process.env.WEBAPP_URL || process.env.VITE_APP_URL;
  const origin = req.headers.origin;
  return String(configuredUrl || origin || 'http://127.0.0.1:5173').replace(/\/$/, '');
};

const activeBookingStatuses = ['pending', 'confirmed'];

const getPreviewRole = (req: VercelRequest) => {
  const value = req.headers['x-beautyos-preview-role'] || req.body?.previewRole;
  const role = Array.isArray(value) ? value[0] : value;
  return role === 'client' || role === 'master' || role === 'admin' ? role : null;
};

const safeTelegramSend = async (label: string, send: () => Promise<unknown>) => {
  try {
    await send();
    return true;
  } catch (err) {
    console.warn(`TELEGRAM_NOTIFY_FAILED:${label}`, getErrorMessage(err));
    return false;
  }
};

const safeTelegramBatch = async (items: Array<[string, () => Promise<unknown>]>) =>
  Promise.all(items.map(([label, send]) => safeTelegramSend(label, send)));

const hasBookingOverlap = async (
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  masterId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
) => {
  let query = supabase
    .from('bookings')
    .select('id')
    .eq('master_id', masterId)
    .in('status', activeBookingStatuses)
    .lt('start_time', endTime)
    .gt('end_time', startTime)
    .limit(1);

  if (excludeBookingId) query = query.neq('id', excludeBookingId);

  const { data, error } = await query;
  if (error) throw error;
  return Boolean(data?.length);
};

/**
 * Unified services endpoint — combines analytics, payments, webhooks.
 * Route by query param ?action=<action_name>
 * 
 * Actions: reminder, create-booking, approve-booking, reject-booking, cancel-booking
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;

  if (action === 'env-check') {
    if (!isDevelopment) {
      return res.status(404).json({ error: 'Not found' });
    }

    const envStatus = {
      supabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      supabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      webappUrl: Boolean(process.env.WEBAPP_URL),
      telegramBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      qstashToken: Boolean(process.env.QSTASH_TOKEN),
      qstashSigningKeys: Boolean(process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY),
      stripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
      stripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    };

    return res.status(200).json({
      ok: Object.values(envStatus).every(Boolean),
      environment: process.env.NODE_ENV || 'unknown',
      envStatus,
    });
  }

  const supabase = getSupabase();
  if (!supabase) return res.status(500).send('Supabase connection failed');

  // --- Security Middleware (Telegram Auth) ---
  // Определяем, какие action требуют валидации TG Hash.
  const secureActions = [
    'get-profile',
    'get-master-details',
    'get-available-slots',
    'get-my-bookings',
    'get-portfolio',
    'get-my-services',
    'list-masters',
    'save-profile',
    'save-service',
    'save-portfolio',
    'delete-service',
    'create-payment',
    'create-booking',
    'update-booking',
    'approve-booking',
    'reject-booking',
    'cancel-booking',
  ];

  const sensitiveSecureActions = [
    'save-profile',
    'save-service',
    'save-portfolio',
    'delete-service',
    'create-payment',
    'create-booking',
    'update-booking',
    'approve-booking',
    'reject-booking',
    'cancel-booking',
  ];
  
  let authUser: TelegramAuthUser | null = null;

  if (secureActions.includes(action)) {
    const initData = req.headers['x-telegram-init-data'] as string;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    const telegramAuthMaxAgeSeconds = sensitiveSecureActions.includes(action)
      ? 10 * 60
      : 24 * 60 * 60;
    const isValid = isDevelopment || validateTelegramWebAppData(initData, botToken, telegramAuthMaxAgeSeconds);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Telegram Signature (API Security Block)' });
    }
    
    authUser = getUserFromInitData(initData);
    if (!authUser?.id && isDevelopment) {
      const fallbackId = getTelegramId(
        req.body?.clientTelegramId ??
        req.body?.masterTelegramId ??
        req.body?.telegramId ??
        process.env.LOCAL_DEV_TELEGRAM_ID ??
        12345678
      );
      authUser = fallbackId ? { id: fallbackId } : null;
    }

    if (!authUser?.id) {
      return res.status(401).json({ error: 'Unauthorized: User data missing' });
    }
  }

  switch (action) {


    case 'get-profile': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      const telegramId = getTelegramId(authUser?.id);
      if (!telegramId) return res.status(401).json({ error: 'Unauthorized: User data missing' });

      const fullName = `${authUser?.first_name || ''} ${authUser?.last_name || ''}`.trim() || `User ${telegramId}`;
      const { data: profile, error } = await supabase
        .from('users')
        .upsert({
          telegram_id: telegramId,
          full_name: fullName,
          role: 'client',
        }, {
          onConflict: 'telegram_id',
          ignoreDuplicates: true,
        })
        .select()
        .single();

      if (error || !profile) {
        const { data: existingProfile, error: readError } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', telegramId)
          .single();

        if (readError || !existingProfile) {
          return res.status(500).json({ error: 'Profile bootstrap failed' });
        }

        return res.status(200).json({ profile: existingProfile });
      }

      return res.status(200).json({ profile });
    }

    case 'get-master-details': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      const masterTelegramId = getTelegramId(req.body?.masterTelegramId);
      if (!masterTelegramId) return res.status(400).json({ error: 'Missing valid masterTelegramId' });
      const previewRole = getPreviewRole(req);
      const requesterTelegramId = getTelegramId(authUser?.id);

      const { data: master, error: masterError } = await supabase
        .from('users')
        .select('id, telegram_id, role, full_name, business_name, address')
        .eq('telegram_id', masterTelegramId)
        .single();

      const isAdminPreviewMaster =
        master?.role === 'admin' &&
        requesterTelegramId === getTelegramId(master.telegram_id) &&
        (previewRole === 'client' || previewRole === 'master');

      if (masterError || !master || (master.role !== 'master' && !isAdminPreviewMaster)) {
        return res.status(404).json({ error: 'Master not found' });
      }

      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('master_id', master.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (servicesError) return res.status(500).json({ error: getErrorMessage(servicesError) });

      let selectedServiceId: string | null = null;
      const rescheduleId = typeof req.body?.rescheduleId === 'string' ? req.body.rescheduleId : null;
      if (rescheduleId) {
        const { data: booking } = await supabase
          .from('bookings')
          .select('service_id, master:master_id(telegram_id), client:client_id(telegram_id)')
          .eq('id', rescheduleId)
          .single();

        const requesterTelegramId = getTelegramId(authUser?.id);
        const bookingMasterTelegramId = getTelegramId((booking as any)?.master?.telegram_id);
        const bookingClientTelegramId = getTelegramId((booking as any)?.client?.telegram_id);
        const canReadBooking =
          isDevelopment ||
          requesterTelegramId === bookingMasterTelegramId ||
          requesterTelegramId === bookingClientTelegramId;

        if (!canReadBooking) {
          return res.status(403).json({ error: 'Forbidden: Cannot read this booking' });
        }

        selectedServiceId = booking?.service_id || null;
      }

      return res.status(200).json({ master, services: services || [], selectedServiceId });
    }

    case 'get-available-slots': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      const masterTelegramId = getTelegramId(req.body?.masterTelegramId);
      const selectedDate = typeof req.body?.date === 'string' ? req.body.date : null;
      const serviceId = typeof req.body?.serviceId === 'string' ? req.body.serviceId : null;
      if (!masterTelegramId || !selectedDate || !serviceId) {
        return res.status(400).json({ error: 'Missing master, date or service' });
      }
      const previewRole = getPreviewRole(req);
      const requesterTelegramId = getTelegramId(authUser?.id);

      const { data: masterProfile } = await supabase
        .from('users')
        .select('role, telegram_id')
        .eq('telegram_id', masterTelegramId)
        .single();

      const isAdminPreviewMaster =
        masterProfile?.role === 'admin' &&
        requesterTelegramId === getTelegramId((masterProfile as any).telegram_id) &&
        (previewRole === 'client' || previewRole === 'master');

      if (!masterProfile || (masterProfile.role !== 'master' && !isAdminPreviewMaster)) {
        return res.status(404).json({ error: 'Master not found' });
      }

      const { data, error } = await supabase.rpc('get_available_slots', {
        m_id: masterTelegramId,
        requested_service_id: serviceId,
        select_date: selectedDate,
      });

      if (error) return res.status(500).json({ error: getErrorMessage(error) });
      const slots = filterFutureSlots(data || []);
      return res.status(200).json({ slots });
    }

    case 'get-my-bookings': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      const telegramId = getTelegramId(authUser?.id);
      if (!telegramId) return res.status(401).json({ error: 'Unauthorized: User data missing' });

      const requestedRole = req.body?.role === 'master' || req.body?.role === 'admin' ? req.body.role : 'client';
      const { data: profile } = await supabase
        .from('users')
        .select('id, role')
        .eq('telegram_id', telegramId)
        .single();

      if (!profile) return res.status(200).json({ bookings: [] });

      let query = supabase
        .from('bookings')
        .select('*, service:service_id(name, duration_mins, price), client:client_id (full_name, phone, telegram_id), master:master_id (full_name, business_name, address, latitude, longitude, telegram_id)');

      if (requestedRole === 'client') {
        query = query.eq('client_id', profile.id);
      } else if (requestedRole === 'admin' && profile.role === 'admin') {
        // Admin intentionally sees all bookings through the server boundary.
      } else {
        query = query.eq('master_id', profile.id);
      }

      const date = typeof req.body?.date === 'string' ? req.body.date : null;
      if (date) {
        const bounds = req.body?.viewMode === 'month' ? monthBounds(date) : dayBounds(date);
        query = query.gte('start_time', bounds.start).lte('start_time', bounds.end);
      }

      const { data, error } = await query.order('start_time', { ascending: true });
      if (error) return res.status(500).json({ error: getErrorMessage(error) });

      return res.status(200).json({ bookings: data || [] });
    }

    case 'get-portfolio': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      const telegramId = getTelegramId(authUser?.id);
      if (!telegramId) return res.status(401).json({ error: 'Unauthorized: User data missing' });

      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramId)
        .single();

      if (!profile) return res.status(200).json({ images: [] });

      const { data, error } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: getErrorMessage(error) });
      return res.status(200).json({ images: data || [] });
    }

    case 'list-masters': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      const location = req.body?.location;
      const userLocation = typeof location?.lat === 'number' && typeof location?.lng === 'number'
        ? { lat: location.lat, lng: location.lng }
        : undefined;
      const previewRole = getPreviewRole(req);
      const requesterTelegramId = getTelegramId(authUser?.id);
      const { data: requesterProfile } = requesterTelegramId
        ? await supabase
          .from('users')
          .select('id, role')
          .eq('telegram_id', requesterTelegramId)
          .single()
        : { data: null };
      const includeAdminPreviewMaster =
        requesterProfile?.role === 'admin' && (previewRole === 'client' || previewRole === 'master');

      const { data: masters, error } = await supabase
        .from('users')
        .select('id, telegram_id, role, full_name, business_name, latitude, longitude')
        .in('role', includeAdminPreviewMaster ? ['master', 'admin'] : ['master'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return res.status(500).json({ error: getErrorMessage(error) });

      const masterIds = (masters || []).map((master: any) => master.id);
      const { data: activeServices } = masterIds.length
        ? await supabase
          .from('services')
          .select('master_id')
          .in('master_id', masterIds)
          .eq('is_active', true)
        : { data: [] };

      const enabledMasterIds = new Set((activeServices || []).map((service: any) => service.master_id));
      const { data: portfolio } = masterIds.length
        ? await supabase
          .from('portfolio')
          .select('user_id, image_url, created_at')
          .in('user_id', masterIds)
          .order('created_at', { ascending: false })
        : { data: [] };

      const previewsByUser = new Map<string, string[]>();
      (portfolio || []).forEach((item: any) => {
        const previews = previewsByUser.get(item.user_id) || [];
        if (previews.length < 3) previews.push(item.image_url);
        previewsByUser.set(item.user_id, previews);
      });

      const result = (masters || [])
        .filter((master: any) => {
          const isRegularMaster = master.role === 'master';
          const isSelfPreviewMaster = includeAdminPreviewMaster && master.id === requesterProfile?.id;
          return enabledMasterIds.has(master.id) && (isRegularMaster || isSelfPreviewMaster);
        })
        .map((master: any) => ({
          ...master,
          dist_km: distanceKm(userLocation, { lat: master.latitude, lng: master.longitude }),
          portfolio_previews: previewsByUser.get(master.id) || [],
        }))
        .sort((a: any, b: any) => {
          if (a.dist_km === null && b.dist_km === null) return 0;
          if (a.dist_km === null) return 1;
          if (b.dist_km === null) return -1;
          return a.dist_km - b.dist_km;
        });

      return res.status(200).json({ masters: result });
    }

    case 'save-profile': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      const telegramId = getTelegramId(authUser?.id);
      if (!telegramId) return res.status(401).json({ error: 'Unauthorized: User data missing' });

      const { businessName, address } = req.body || {};
      const { data: profile, error } = await supabase
        .from('users')
        .update({
          business_name: typeof businessName === 'string' ? businessName.trim() : null,
          address: typeof address === 'string' ? address.trim() : null,
        })
        .eq('telegram_id', telegramId)
        .select()
        .single();

      if (error) return res.status(500).json({ error: getErrorMessage(error) });
      return res.status(200).json({ profile });
    }

    case 'get-my-services': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      const telegramId = getTelegramId(authUser?.id);
      if (!telegramId) return res.status(401).json({ error: 'Unauthorized: User data missing' });

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, role')
        .eq('telegram_id', telegramId)
        .single();

      if (profileError || !profile) return res.status(404).json({ error: 'Profile not found' });
      if (!['master', 'admin'].includes(profile.role)) {
        return res.status(403).json({ error: 'Only masters can manage services' });
      }

      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('master_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: getErrorMessage(error) });
      return res.status(200).json({ services: services || [] });
    }

    case 'save-service': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      const telegramId = getTelegramId(authUser?.id);
      if (!telegramId) return res.status(401).json({ error: 'Unauthorized: User data missing' });

      const { id, name, description, price, durationMins, isActive } = req.body || {};
      const cleanName = typeof name === 'string' ? name.trim() : '';
      const cleanDescription = typeof description === 'string' ? description.trim().slice(0, 240) : '';
      const cleanPrice = Number(price);
      const cleanDuration = Number(durationMins);

      if (!cleanName) return res.status(400).json({ error: 'Service name is required' });
      if (typeof description === 'string' && description.trim().length > 240) {
        return res.status(400).json({ error: 'Service description must be 240 characters or fewer' });
      }
      if (!Number.isFinite(cleanPrice) || cleanPrice < 0) {
        return res.status(400).json({ error: 'Service price must be 0 or higher' });
      }
      if (!Number.isFinite(cleanDuration) || cleanDuration < 15 || cleanDuration > 480) {
        return res.status(400).json({ error: 'Service duration must be between 15 and 480 minutes' });
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, role')
        .eq('telegram_id', telegramId)
        .single();

      if (profileError || !profile) return res.status(404).json({ error: 'Profile not found' });
      if (!['master', 'admin'].includes(profile.role)) {
        return res.status(403).json({ error: 'Only masters can manage services' });
      }

      const payload = {
        master_id: profile.id,
        name: cleanName,
        description: cleanDescription || null,
        price: cleanPrice,
        duration_mins: cleanDuration,
        is_active: typeof isActive === 'boolean' ? isActive : true,
      };

      if (typeof id === 'string' && id.trim()) {
        let { data: service, error } = await supabase
          .from('services')
          .update(payload)
          .eq('id', id)
          .eq('master_id', profile.id)
          .select('*')
          .single();

        if (error && missingDescriptionColumnError(error)) {
          const fallbackPayload = {
            master_id: profile.id,
            name: cleanName,
            price: cleanPrice,
            duration_mins: cleanDuration,
            is_active: typeof isActive === 'boolean' ? isActive : true,
          };

          ({ data: service, error } = await supabase
            .from('services')
            .update(fallbackPayload)
            .eq('id', id)
            .eq('master_id', profile.id)
            .select('*')
            .single());
        }

        if (error) return res.status(500).json({ error: getErrorMessage(error) });
        return res.status(200).json({ service });
      }

      let { data: service, error } = await supabase
        .from('services')
        .insert(payload)
        .select('*')
        .single();

      if (error && missingDescriptionColumnError(error)) {
        const fallbackPayload = {
          master_id: profile.id,
          name: cleanName,
          price: cleanPrice,
          duration_mins: cleanDuration,
          is_active: typeof isActive === 'boolean' ? isActive : true,
        };

        ({ data: service, error } = await supabase
          .from('services')
          .insert(fallbackPayload)
          .select('*')
          .single());
      }

      if (error) return res.status(500).json({ error: getErrorMessage(error) });
      return res.status(200).json({ service });
    }

    case 'delete-service': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      const telegramId = getTelegramId(authUser?.id);
      if (!telegramId) return res.status(401).json({ error: 'Unauthorized: User data missing' });

      const { id } = req.body || {};
      if (typeof id !== 'string' || !id.trim()) {
        return res.status(400).json({ error: 'Service id is required' });
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, role')
        .eq('telegram_id', telegramId)
        .single();

      if (profileError || !profile) return res.status(404).json({ error: 'Profile not found' });
      if (!['master', 'admin'].includes(profile.role)) {
        return res.status(403).json({ error: 'Only masters can manage services' });
      }

      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)
        .eq('master_id', profile.id);

      if (error) return res.status(500).json({ error: getErrorMessage(error) });
      return res.status(200).json({ success: true });
    }

    case 'save-portfolio': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      const telegramId = getTelegramId(authUser?.id);
      if (!telegramId) return res.status(401).json({ error: 'Unauthorized: User data missing' });

      const { imageUrl, type = 'ai_creation', metadata = {} } = req.body || {};
      if (typeof imageUrl !== 'string' || !imageUrl.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Missing valid portfolio image' });
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramId)
        .single();

      if (profileError || !profile) return res.status(404).json({ error: 'Profile not found' });

      const { error } = await supabase
        .from('portfolio')
        .insert([{
          user_id: profile.id,
          image_url: imageUrl,
          type,
          metadata,
        }]);

      if (error) return res.status(500).json({ error: getErrorMessage(error) });
      return res.status(200).json({ success: true });
    }

    case 'create-payment': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      const { plan } = req.body || {};
      if (typeof plan !== 'string' || !(plan in subscriptionPlans)) {
        return res.status(400).json({ error: 'Missing or unsupported payment plan' });
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(501).json({
          error: 'Payments are not configured yet',
          code: 'PAYMENTS_NOT_CONFIGURED',
        });
      }

      const telegramId = getTelegramId(authUser?.id);
      if (!telegramId) return res.status(401).json({ error: 'Unauthorized: User data missing' });

      const selectedPlan = subscriptionPlans[plan as keyof typeof subscriptionPlans];
      const configuredPriceId = process.env[selectedPlan.envPriceId];
      const appUrl = getPublicAppUrl(req);

      const { data: profile } = await supabase
        .from('users')
        .select('id, telegram_id, full_name')
        .eq('telegram_id', telegramId)
        .single();

      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = configuredPriceId
        ? { price: configuredPriceId, quantity: 1 }
        : {
          price_data: {
            currency: 'ils',
            recurring: { interval: 'month' as const },
            unit_amount: selectedPlan.priceIls * 100,
            product_data: { name: selectedPlan.name },
          },
          quantity: 1,
        };

      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [lineItem],
        success_url: `${appUrl}/pricing?checkout=success&plan=${encodeURIComponent(plan)}`,
        cancel_url: `${appUrl}/pricing?checkout=cancelled`,
        client_reference_id: String(profile.telegram_id),
        allow_promotion_codes: true,
        metadata: {
          plan,
          telegram_id: String(profile.telegram_id),
          user_id: profile.id,
        },
        subscription_data: {
          metadata: {
            plan,
            telegram_id: String(profile.telegram_id),
            user_id: profile.id,
          },
        },
      });

      return res.status(200).json({ url: session.url });
    }


    // --- Reminder Webhook ---
    case 'reminder': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      
      const { verifyQStashSignature } = await import('./_lib/security.js');
      const isQAuthorized = await verifyQStashSignature(req);
      if (!isQAuthorized) {
        return res.status(401).json({ error: 'Unauthorized: Invalid QStash Signature (Security Block)' });
      }

      const { bookingId, type } = req.body;
      if (!bookingId) return res.status(400).send('Missing bookingId');

      const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, master:master_id (telegram_id, business_name, full_name), client:client_id (telegram_id, full_name)')
        .eq('id', bookingId).single();
      
      if (error || !booking) return res.status(404).send('Booking not found');
      if (booking.status !== 'confirmed') {
        return res.status(200).json({ skipped: true, reason: 'booking_not_confirmed' });
      }
      if ((type === '24h' && booking.notified_24h) || (type === '3h' && booking.notified_3h)) {
        return res.status(200).json({ skipped: true, reason: 'already_notified' });
      }
      
      const timeStr = new Date(booking.start_time).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
      const pre = type === '24h' ? '📢 תזכורת: מחר' : '⏰ תזכורת: בעוד 3 שעות';
      
      const clientMsg = `${pre} יש לך תור ב-${booking.master.business_name || booking.master.full_name}!\n🕓 שעה: ${timeStr}\nמחכים לך! ✨`;
      const masterMsg = `${pre} מגיע/ה אליך ${booking.client.full_name || 'לקוח/ה'}.\n🕓 שעה: ${timeStr}\nהכן/י את מקום העבודה! 💇‍♀️`;
      
      try {
        await safeTelegramBatch([
          ['reminder-master', () => bot.telegram.sendMessage(booking.master.telegram_id, masterMsg)],
          ['reminder-client', () => bot.telegram.sendMessage(booking.client.telegram_id, clientMsg)],
        ]);
        const updateField = type === '24h' ? { notified_24h: true } : { notified_3h: true };
        await supabase.from('bookings').update(updateField).eq('id', bookingId);
        return res.status(200).json({ success: true });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        return res.status(500).send('Error sending messages');
      }
    }

    // --- [DIAGNOSTIC MODE v37] ---
    case 'diagnostic': {
      if (!isDevelopment) {
        return res.status(404).json({ error: 'Not found' });
      }

      const results: any = { timestamp: new Date().toISOString(), tests: {} };
      try {
        const { analyzeAndGenerate } = await import('./_lib/content-engine.js');
        const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
        await analyzeAndGenerate(testBuffer, 'diagnostic-test');
        results.tests.gemini_api = { status: 'PASSED' };
      } catch (e: any) {
        results.tests.gemini_api = { status: 'FAILED', error: e.message };
      }
      return res.status(200).json(results);
    }

    case 'create-booking': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { masterTelegramId, clientTelegramId, serviceId, startTime, endTime } = req.body;
      const mId = Number(masterTelegramId);
      const cId = Number(clientTelegramId);
      const previewRole = getPreviewRole(req);
      if (!mId || !cId) return res.status(400).send('Missing valid IDs');

      // Security Check: You can only book for yourself (or you are admin, but let's stick to strict validation)
      if (authUser && Number(authUser.id) !== cId && !isDevelopment) {
          return res.status(403).json({ error: 'Forbidden: Cannot create booking for another user' });
      }

      try {
        const { data: mUser } = await supabase.from('users').select('id, role, business_name, full_name, telegram_id').eq('telegram_id', mId).single();
        const { data: cUser } = await supabase.from('users').select('id, full_name, telegram_id').eq('telegram_id', cId).single();
        
        if (!mUser || !cUser) return res.status(404).json({ error: 'Master or Client not found in DB' });
        const isAdminPreviewMaster =
          mUser.role === 'admin' &&
          Number(authUser?.id) === Number(mUser.telegram_id) &&
          mId === cId &&
          (previewRole === 'client' || previewRole === 'master');
        if (mUser.role !== 'master' && !isAdminPreviewMaster) {
          return res.status(400).json({ error: 'Selected provider is not available for booking' });
        }

        // Если передана услуга, получаем её цену и длительность
        let duration = 60;
        let price = 0;
        if (serviceId) {
          const { data: svc } = await supabase
            .from('services')
            .select('price, duration_mins')
            .eq('id', serviceId)
            .eq('master_id', mUser.id)
            .eq('is_active', true)
            .single();

          if (!svc) return res.status(400).json({ error: 'Selected service is not available for this master' });
          price = Number(svc.price);
          duration = Number(svc.duration_mins);
        }

        if (isPastBookingStart(startTime)) {
          return res.status(409).json({ error: 'Selected time has already passed. Please choose a later time.' });
        }

        const calculatedEndTime = new Date(new Date(startTime).getTime() + duration * 60 * 1000).toISOString();
        const finalEndTime = endTime || calculatedEndTime;
        const overlaps = await hasBookingOverlap(supabase, mUser.id, startTime, finalEndTime);
        if (overlaps) return res.status(409).json({ error: 'Selected time is no longer available' });

        const { data: booking, error: bErr } = await supabase
          .from('bookings')
          .insert({
            master_id: mUser.id,
            client_id: cUser.id,
            service_id: serviceId || null,
            total_price: price || null,
            scheduled_at: startTime,
            start_time: startTime,
            end_time: finalEndTime,
            status: 'pending'
          })
          .select()
          .single();

        if (bErr) throw bErr;

        const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
        const timeStr = new Date(startTime).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        
        const masterMsg = `🔔 **בקשת תור חדשה!**\n👤 לקוח: ${cUser.full_name}\n🕓 שעה: ${timeStr}\n\nהנה האפשרויות שלך:`;
        const clientMsg = `⏳ **בקשתך נשלחה!**\n📍 עסק: ${mUser.business_name || mUser.full_name}\n🕓 שעה: ${timeStr}\n\nאנחנו מחכים לאישור המאסטר. נעדכן אותך מיד כשיתקבל אישור! 🙏`;

        await safeTelegramBatch([
          ['create-booking-master', () => bot.telegram.sendMessage(masterTelegramId, masterMsg, { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ אישור תור', callback_data: `approve_${booking.id}` },
                  { text: '❌ דחייה', callback_data: `reject_${booking.id}` }
                ],
                [
                  { text: '📞 פנייה ללקוח', url: `tg://user?id=${clientTelegramId}` }
                ]
              ]
            }
          })],
          ['create-booking-client', () => bot.telegram.sendMessage(clientTelegramId, clientMsg, { parse_mode: 'Markdown' })],
        ]);

        return res.status(200).json({ success: true, bookingId: booking.id });
      } catch (err: any) {
        console.error('BOOKING ERROR:', err);
        return res.status(500).json({ error: err.message });
      }
    }

    // --- Approve Booking ---
    case 'approve-booking': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { bookingId } = req.body;
      if (!bookingId) return res.status(400).send('Missing bookingId');

      try {
        const { data: existingBooking, error: ownershipErr } = await supabase
          .from('bookings')
          .select('id, master_id, status, start_time, end_time, master:master_id (telegram_id)')
          .eq('id', bookingId)
          .single();

        if (ownershipErr || !existingBooking) return res.status(404).send('Booking not found');

        const masterTelegramId = getTelegramId((existingBooking as any).master?.telegram_id);
        if (!isDevelopment && masterTelegramId !== getTelegramId(authUser?.id)) {
          return res.status(403).json({ error: 'Forbidden: Only the assigned master can approve this booking' });
        }
        if (existingBooking.status !== 'pending') {
          return res.status(409).json({ error: 'Only pending bookings can be approved' });
        }
        if (isPastBookingStart(existingBooking.start_time)) {
          return res.status(409).json({ error: 'This appointment time has already passed and can no longer be approved' });
        }
        const overlaps = await hasBookingOverlap(
          supabase,
          existingBooking.master_id,
          existingBooking.start_time,
          existingBooking.end_time,
          existingBooking.id
        );
        if (overlaps) return res.status(409).json({ error: 'Selected time is no longer available' });

        const { data: booking, error: bErr } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingId)
          .eq('status', 'pending')
          .select('*, master:master_id (telegram_id, business_name, full_name), client:client_id (telegram_id, full_name)')
          .single();

        if (bErr || !booking) return res.status(404).send('Booking not found');

        const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
        const timeStr = new Date(booking.start_time).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        
        const clientMsg = `✅ **יש! התור שלך אושר!**\n📍 עסק: ${booking.master.business_name || booking.master.full_name}\n🕓 שעה: ${timeStr}\n\nנתראה בקרוב! ✨`;
        await safeTelegramSend('approve-booking-client', () =>
          bot.telegram.sendMessage(booking.client.telegram_id, clientMsg, { parse_mode: 'Markdown' })
        );

        // Schedule QStash Reminders
        const now = new Date().getTime();
        const start = new Date(booking.start_time).getTime();
        
        const delay24h = (start - (24 * 60 * 60 * 1000) - now) / 1000;
        if (delay24h > 0) await scheduleNotification(Math.floor(delay24h), '24h', booking.id);

        const delay3h = (start - (3 * 60 * 60 * 1000) - now) / 1000;
        if (delay3h > 0) await scheduleNotification(Math.floor(delay3h), '3h', booking.id);

        return res.status(200).json({ success: true });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }

    // --- Reject Booking ---
    case 'reject-booking': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { bookingId } = req.body;
      if (!bookingId) return res.status(400).send('Missing bookingId');

      try {
        const { data: existingBooking, error: ownershipErr } = await supabase
          .from('bookings')
          .select('id, status, master:master_id (telegram_id)')
          .eq('id', bookingId)
          .single();

        if (ownershipErr || !existingBooking) return res.status(404).send('Booking not found');

        const masterTelegramId = getTelegramId((existingBooking as any).master?.telegram_id);
        if (!isDevelopment && masterTelegramId !== getTelegramId(authUser?.id)) {
          return res.status(403).json({ error: 'Forbidden: Only the assigned master can reject this booking' });
        }
        if (existingBooking.status !== 'pending') {
          return res.status(409).json({ error: 'Only pending bookings can be rejected' });
        }

        const { data: booking, error: bErr } = await supabase
          .from('bookings')
          .update({ status: 'cancelled_by_master' })
          .eq('id', bookingId)
          .eq('status', 'pending')
          .select('*, master:master_id (telegram_id, business_name, full_name), client:client_id (telegram_id, full_name)')
          .single();

        if (bErr || !booking) return res.status(404).send('Booking not found');

        const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
        const timeStr = new Date(booking.start_time).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        
        const clientMsg = `😔 **מצטערים, התור לא אושר...**\n📍 עסק: ${booking.master.business_name || booking.master.full_name}\n🕓 שעה: ${timeStr}\n\nהמאסטר לא פנוי במועד זה. נשמח אם תבחרי מועד אחר ביומן! ✨`;
        await safeTelegramSend('reject-booking-client', () =>
          bot.telegram.sendMessage(booking.client.telegram_id, clientMsg, { parse_mode: 'Markdown' })
        );

        return res.status(200).json({ success: true });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }

    // --- Cancel Booking ---
    case 'cancel-booking': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { bookingId, userId, role } = req.body;
      if (!bookingId || !userId) return res.status(400).send('Missing bookingId or userId');
      if (!['master', 'client'].includes(role)) return res.status(400).send('Invalid cancellation role');

      try {
        const { data: existingBooking, error: ownershipErr } = await supabase
          .from('bookings')
          .select('id, status, master:master_id (telegram_id), client:client_id (telegram_id)')
          .eq('id', bookingId)
          .single();

        if (ownershipErr || !existingBooking) return res.status(404).send('Booking not found');

        const requesterTelegramId = getTelegramId(authUser?.id);
        const masterTelegramId = getTelegramId((existingBooking as any).master?.telegram_id);
        const clientTelegramId = getTelegramId((existingBooking as any).client?.telegram_id);
        const isAuthorized =
          role === 'master'
            ? requesterTelegramId === masterTelegramId
            : requesterTelegramId === clientTelegramId;

        if (!isDevelopment && !isAuthorized) {
          return res.status(403).json({ error: 'Forbidden: Cannot cancel a booking for another user' });
        }
        if (!activeBookingStatuses.includes(existingBooking.status)) {
          return res.status(409).json({ error: 'Booking is not active' });
        }

        const status = role === 'master' ? 'cancelled_by_master' : 'cancelled_by_client';
        const { data: booking, error: bErr } = await supabase
          .from('bookings')
          .update({ status, notified_24h: false, notified_3h: false })
          .eq('id', bookingId)
          .in('status', activeBookingStatuses)
          .select('*, master:master_id (telegram_id, business_name, full_name), client:client_id (telegram_id, full_name)')
          .single();

        if (bErr || !booking) return res.status(404).send('Booking not found');

        const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
        const timeStr = new Date(booking.start_time).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        
        if (role === 'master') {
          // Notify Client
          const msg = `😔 **מצטערים, חל שינוי בלוח הזמנים...**\n\nהתור שלך ב-${booking.master.business_name || booking.master.full_name} ב-**${timeStr}** בוטל על ידי המאסטר.\n\nנשמח אם תקבעי תור למועד חדש! ✨`;
          await safeTelegramSend('cancel-booking-client', () =>
            bot.telegram.sendMessage(booking.client.telegram_id, msg, { parse_mode: 'Markdown' })
          );
        } else {
          // Notify Master
          const msg = `📢 **עדכון: ביטול תור**\n\nהלקוח/ה ${booking.client.full_name} ביטל/ה את התור שנקבע ל-**${timeStr}**.\n\nהמועד הזה התפנה כעת ביומן שלך. 💇‍♀️`;
          await safeTelegramSend('cancel-booking-master', () =>
            bot.telegram.sendMessage(booking.master.telegram_id, msg, { parse_mode: 'Markdown' })
          );
        }

        return res.status(200).json({ success: true });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }

    // --- Update/Move Booking ---
    case 'update-booking': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { bookingId, startTime } = req.body;
      if (!bookingId || !startTime) return res.status(400).send('Missing bookingId or startTime');

      try {
        const { data: oldBooking } = await supabase
          .from('bookings')
          .select('*, service:service_id(duration_mins), master:master_id(telegram_id), client:client_id(telegram_id)')
          .eq('id', bookingId)
          .single();

        if (!oldBooking) return res.status(404).send('Booking not found');
        if (!activeBookingStatuses.includes(oldBooking.status)) {
          return res.status(409).json({ error: 'Booking is not active' });
        }

        const requesterTelegramId = getTelegramId(authUser?.id);
        const masterTelegramId = getTelegramId((oldBooking as any).master?.telegram_id);
        const clientTelegramId = getTelegramId((oldBooking as any).client?.telegram_id);
        if (!isDevelopment && requesterTelegramId !== masterTelegramId && requesterTelegramId !== clientTelegramId) {
          return res.status(403).json({ error: 'Forbidden: Cannot reschedule a booking for another user' });
        }

        const duration = oldBooking.service?.duration_mins || 60;
        if (isPastBookingStart(startTime)) {
          return res.status(409).json({ error: 'Selected time has already passed. Please choose a later time.' });
        }
        const endTime = new Date(new Date(startTime).getTime() + duration * 60 * 1000).toISOString();
        const overlaps = await hasBookingOverlap(supabase, oldBooking.master_id, startTime, endTime, oldBooking.id);
        if (overlaps) return res.status(409).json({ error: 'Selected time is no longer available' });

        const { data: booking, error: bErr } = await supabase
          .from('bookings')
          .update({ scheduled_at: startTime, start_time: startTime, end_time: endTime, status: 'pending', notified_24h: false, notified_3h: false })
          .eq('id', bookingId)
          .in('status', activeBookingStatuses)
          .select('*, master:master_id (telegram_id, business_name, full_name), client:client_id (telegram_id, full_name)')
          .single();

        if (bErr) throw bErr;

        const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
        const timeStr = new Date(startTime).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        
        const masterMsg = `🔄 **התור הוזז!**\n👤 לקוח: ${booking.client.full_name}\n🕓 שעה חדשה: ${timeStr}\n\nהשינוי עודכן ביומן. ✨`;
        const clientMsg = `🔄 **עדכון: התור שלך הוזז**\n📍 עסק: ${booking.master.business_name || booking.master.full_name}\n🕓 שעה חדשה: ${timeStr}\n\nהשינוי מחכה לאישור סופי או מעודכן במערכת. 🙏`;

        await safeTelegramBatch([
          ['update-booking-master', () => bot.telegram.sendMessage(booking.master.telegram_id, masterMsg, { parse_mode: 'Markdown' })],
          ['update-booking-client', () => bot.telegram.sendMessage(booking.client.telegram_id, clientMsg, { parse_mode: 'Markdown' })],
        ]);

        return res.status(200).json({ success: true });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }

    default:
      return res.status(400).json({ error: `any action: ${action}` });
  }
}
