/**
 * Payment Service for BeautyOS AI
 * Handles Stripe Checkout Session creation using Fetch API to avoid SDK dependency issues.
 */
export interface PaymentLinkParams {
    serviceName: string;
    amount: number;
    currency: 'ils' | 'rub' | 'usd';
    bookingId: string;
}
export declare function createCheckoutSession(params: PaymentLinkParams): Promise<string>;
//# sourceMappingURL=paymentService.d.ts.map