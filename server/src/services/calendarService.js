import axios from 'axios';
const CAL_API = process.env.CALCOM_BASE_URL || 'https://api.cal.com/v1';
const CAL_KEY = process.env.CALCOM_API_KEY;
export class CalendarService {
    /**
     * Получает доступные слоты для мастера на ближайшую неделю
     */
    async getAvailableSlots(eventTypeId) {
        if (!CAL_KEY) {
            console.warn('CALCOM_API_KEY is not set. Returning mock slots for development.');
            return this.getMockSlots();
        }
        try {
            const today = new Date();
            const nextWeek = new Date();
            nextWeek.setDate(today.getDate() + 7);
            const { data } = await axios.get(`${CAL_API}/slots`, {
                params: {
                    apiKey: CAL_KEY,
                    eventTypeId,
                    startTime: today.toISOString(),
                    endTime: nextWeek.toISOString(),
                },
            });
            // Cal.com возвращает объект { slots: { "2024-03-20": [...] } }
            const slots = [];
            if (data.slots) {
                Object.values(data.slots).forEach((daySlots) => {
                    slots.push(...daySlots);
                });
            }
            return slots.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        }
        catch (error) {
            console.error('Error fetching Cal.com slots:', error);
            return this.getMockSlots();
        }
    }
    /**
     * Создает бронирование в Cal.com
     */
    async createBooking(params) {
        if (!CAL_KEY) {
            console.log('Mock: Creating booking in Cal.com...', params);
            return { id: 'mock_' + Date.now(), uid: 'mock_uid' };
        }
        try {
            const { data } = await axios.post(`${CAL_API}/bookings`, {
                apiKey: CAL_KEY,
                eventTypeId: params.eventTypeId,
                start: params.startTime,
                responses: {
                    name: params.name,
                    email: params.email,
                    phone: params.phone || '',
                    notes: params.notes || '',
                },
                timeZone: 'Asia/Jerusalem',
                language: 'ru',
            });
            return { id: data.id, uid: data.uid };
        }
        catch (error) {
            console.error('Error creating Cal.com booking:', error);
            throw error;
        }
    }
    getMockSlots() {
        const slots = [];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        for (let i = 0; i < 5; i++) {
            const slotTime = new Date(tomorrow);
            slotTime.setHours(10 + i, 0, 0, 0);
            slots.push({ time: slotTime.toISOString() });
        }
        return slots;
    }
}
export const calendarService = new CalendarService();
//# sourceMappingURL=calendarService.js.map