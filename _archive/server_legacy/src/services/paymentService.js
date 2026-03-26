/**
 * Payment Service for BeautyOS AI
 * Handles Stripe Checkout Session creation using Fetch API to avoid SDK dependency issues.
 */
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_API_URL = 'https://api.stripe.com/v1';
export async function createCheckoutSession(params) {
    const { serviceName, amount, currency, bookingId } = params;
    // Конвертируем в минимальные единицы (агорот/копейки/центы)
    const unitAmount = Math.round(amount * 100);
    const body = new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': currency,
        'line_items[0][price_data][product_data][name]': serviceName,
        'line_items[0][price_data][unit_amount]': unitAmount.toString(),
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `https://t.me/BeautyOS_AI_Bot?start=pay_success_${bookingId}`,
        'cancel_url': `https://t.me/BeautyOS_AI_Bot?start=pay_cancel_${bookingId}`,
        'metadata[bookingId]': bookingId,
    });
    try {
        const response = await fetch(`${STRIPE_API_URL}/checkout/sessions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Stripe Error: ${data.error?.message || response.statusText}`);
        }
        return data.url; // URL для перехода на страницу Stripe Checkout
    }
    catch (error) {
        console.error('Error creating Stripe session:', error);
        throw error;
    }
}
//# sourceMappingURL=paymentService.js.map