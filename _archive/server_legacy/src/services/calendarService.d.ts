export interface CalSlot {
    time: string;
}
export declare class CalendarService {
    /**
     * Получает доступные слоты для мастера на ближайшую неделю
     */
    getAvailableSlots(eventTypeId: number): Promise<CalSlot[]>;
    /**
     * Создает бронирование в Cal.com
     */
    createBooking(params: {
        eventTypeId: number;
        startTime: string;
        name: string;
        email: string;
        phone?: string;
        notes?: string;
    }): Promise<{
        id: any;
        uid: any;
    }>;
    private getMockSlots;
}
export declare const calendarService: CalendarService;
//# sourceMappingURL=calendarService.d.ts.map