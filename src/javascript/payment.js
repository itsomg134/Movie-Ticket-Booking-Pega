/**
 * ============================================================
 * PAYMENT.JS - Complete Payment Processing Module
 * Version: 1.0.0
 * Author: CineWave Entertainment
 * Description: Handles payment processing, validation,
 *              and integration with payment gateways
 * ============================================================
 */

// ============================================================
// CONFIGURATION
// ============================================================

const PAYMENT_CONFIG = {
    API_BASE_URL: 'http://localhost:8080/api/payments',
    CURRENCY: 'INR',
    TAX_RATE: 0.18, // 18% GST
    SERVICE_CHARGE: 25, // ₹25 service fee
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 2000,
    SUPPORTED_METHODS: [
        'UPI',
        'Credit Card',
        'Debit Card',
        'Net Banking',
        'Wallet'
    ],
    CARD_TYPES: {
        'Visa': /^4[0-9]{12}(?:[0-9]{3})?$/,
        'Mastercard': /^5[1-5][0-9]{14}$/,
        'RuPay': /^6[0-9]{15}$/,
        'Amex': /^3[47][0-9]{13}$/
    }
};

// ============================================================
// PAYMENT CLASS
// ============================================================

class Payment {
    /**
     * Create a new payment instance
     * @param {Object} data - Payment data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.bookingId = data.bookingId || null;
        this.amount = data.amount || 0;
        this.taxAmount = data.taxAmount || 0;
        this.serviceCharge = data.serviceCharge || PAYMENT_CONFIG.SERVICE_CHARGE;
        this.totalAmount = data.totalAmount || 0;
        this.paymentMethod = data.paymentMethod || null;
        this.paymentStatus = data.paymentStatus || 'Pending';
        this.transactionId = data.transactionId || this.generateTransactionId();
        this.paymentGateway = data.paymentGateway || null;
        this.gatewayResponse = data.gatewayResponse || null;
        this.cardLastFour = data.cardLastFour || null;
        this.cardType = data.cardType || null;
        this.upiId = data.upiId || null;
        this.bankName = data.bankName || null;
        this.paymentDate = data.paymentDate || null;
        this.refundAmount = data.refundAmount || null;
        this.refundDate = data.refundDate || null;
        this.refundReason = data.refundReason || null;
        this.customerEmail = data.customerEmail || null;
        this.customerPhone = data.customerPhone || null;
        this.billingAddress = data.billingAddress || null;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Generate unique transaction ID
     */
    generateTransactionId() {
        const prefix = 'TXN';
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Calculate total amount with taxes and charges
     */
    calculateTotal() {
        this.taxAmount = this.amount * PAYMENT_CONFIG.TAX_RATE;
        this.totalAmount = this.amount + this.taxAmount + this.serviceCharge;
        return this.totalAmount;
    }

    /**
     * Validate payment data
     */
    validate() {
        const errors = [];

        // Check amount
        if (this.amount <= 0) {
            errors.push('Invalid payment amount');
        }

        // Check payment method
        if (!this.paymentMethod) {
            errors.push('Payment method is required');
        }

        if (!PAYMENT_CONFIG.SUPPORTED_METHODS.includes(this.paymentMethod)) {
            errors.push(`Unsupported payment method: ${this.paymentMethod}`);
        }

        // Validate based on payment method
        switch (this.paymentMethod) {
            case 'Credit Card':
            case 'Debit Card':
                if (!this.cardNumber) {
                    errors.push('Card number is required');
                } else if (!this.isValidCardNumber(this.cardNumber)) {
                    errors.push('Invalid card number');
                }
                if (!this.cardExpiry) {
                    errors.push('Card expiry date is required');
                } else if (!this.isValidCardExpiry(this.cardExpiry)) {
                    errors.push('Invalid or expired card');
                }
                if (!this.cardCvv) {
                    errors.push('CVV is required');
                } else if (!this.isValidCvv(this.cardCvv)) {
                    errors.push('Invalid CVV');
                }
                break;
            case 'UPI':
                if (!this.upiId) {
                    errors.push('UPI ID is required');
                } else if (!this.isValidUpiId(this.upiId)) {
                    errors.push('Invalid UPI ID format');
                }
                break;
            case 'Net Banking':
                if (!this.bankName) {
                    errors.push('Bank name is required');
                }
                break;
            case 'Wallet':
                // Wallet validation handled by gateway
                break;
        }

        // Check booking reference
        if (!this.bookingId) {
            errors.push('Booking reference is required');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate card number
     */
    isValidCardNumber(cardNumber) {
        const cleaned = cardNumber.replace(/\s/g, '');
        if (!/^\d{13,19}$/.test(cleaned)) return false;

        // Luhn algorithm check
        let sum = 0;
        let shouldDouble = false;
        for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned.charAt(i));
            if (shouldDouble) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            shouldDouble = !shouldDouble;
        }
        return sum % 10 === 0;
    }

    /**
     * Detect card type
     */
    detectCardType(cardNumber) {
        const cleaned = cardNumber.replace(/\s/g, '');
        for (const [type, pattern] of Object.entries(PAYMENT_CONFIG.CARD_TYPES)) {
            if (pattern.test(cleaned)) {
                return type;
            }
        }
        return 'Unknown';
    }

    /**
     * Validate card expiry date
     */
    isValidCardExpiry(expiry) {
        const [month, year] = expiry.split('/');
        if (!month || !year) return false;

        const m = parseInt(month);
        const y = parseInt(year);
        if (m < 1 || m > 12) return false;

        const now = new Date();
        const currentYear = now.getFullYear() % 100;
        const currentMonth = now.getMonth() + 1;

        return y > currentYear || (y === currentYear && m >= currentMonth);
    }

    /**
     * Validate CVV
     */
    isValidCvv(cvv) {
        return /^\d{3,4}$/.test(cvv);
    }

    /**
     * Validate UPI ID
     */
    isValidUpiId(upiId) {
        return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(upiId);
    }

    /**
     * Format amount for display
     */
    formatAmount(amount = this.amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: PAYMENT_CONFIG.CURRENCY,
            minimumFractionDigits: 2
        }).format(amount);
    }

    /**
     * Get payment method display name
     */
    getMethodDisplayName() {
        const names = {
            'UPI': 'UPI',
            'Credit Card': '💳 Credit Card',
            'Debit Card': '💳 Debit Card',
            'Net Banking': '🏦 Net Banking',
            'Wallet': '📱 Wallet'
        };
        return names[this.paymentMethod] || this.paymentMethod;
    }

    /**
     * Get status badge class
     */
    getStatusBadgeClass() {
        const classes = {
            'Pending': 'badge-warning',
            'Processing': 'badge-info',
            'Success': 'badge-success',
            'Failed': 'badge-danger',
            'Refunded': 'badge-secondary'
        };
        return classes[this.paymentStatus] || 'badge-info';
    }

    /**
     * Convert to plain object for API
     */
    toJSON() {
        return {
            bookingId: this.bookingId,
            amount: this.amount,
            taxAmount: this.taxAmount,
            serviceCharge: this.serviceCharge,
            totalAmount: this.totalAmount,
            paymentMethod: this.paymentMethod,
            cardNumber: this.cardNumber,
            cardExpiry: this.cardExpiry,
            cardCvv: this.cardCvv,
            upiId: this.upiId,
            bankName: this.bankName,
            customerEmail: this.customerEmail,
            customerPhone: this.customerPhone,
            billingAddress: this.billingAddress
        };
    }

    /**
     * Create from API response
     */
    static fromAPI(data) {
        return new Payment({
            id: data.paymentId || data.id,
            bookingId: data.bookingId,
            amount: data.amount,
            taxAmount: data.taxAmount || data.amount * PAYMENT_CONFIG.TAX_RATE,
            serviceCharge: data.serviceCharge || PAYMENT_CONFIG.SERVICE_CHARGE,
            totalAmount: data.totalAmount || data.amount,
            paymentMethod: data.paymentMethod,
            paymentStatus: data.paymentStatus || 'Pending',
            transactionId: data.transactionId,
            paymentGateway: data.paymentGateway,
            gatewayResponse: data.gatewayResponse,
            cardLastFour: data.cardLastFour,
            cardType: data.cardType,
            upiId: data.upiId,
            bankName: data.bankName,
            paymentDate: data.paymentDate,
            refundAmount: data.refundAmount,
            refundDate: data.refundDate,
            refundReason: data.refundReason,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
            billingAddress: data.billingAddress,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
    }
}

// ============================================================
// PAYMENT API SERVICE
// ============================================================

class PaymentAPI {
    /**
     * Process payment
     * @param {Payment} payment - Payment instance
     * @returns {Promise<Payment>}
     */
    static async processPayment(payment) {
        try {
            // Validate payment
            const validation = payment.validate();
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            // Calculate total
            payment.calculateTotal();

            // Prepare request
            const requestData = payment.toJSON();

            // Simulate API call
            const response = await this.simulateAPICall('/process', 'POST', requestData);

            if (response.success) {
                const processedPayment = Payment.fromAPI(response.data);
                console.log('✅ Payment processed:', processedPayment.transactionId);
                return processedPayment;
            } else {
                throw new Error(response.message || 'Payment processing failed');
            }
        } catch (error) {
            console.error('❌ Payment processing failed:', error);
            throw error;
        }
    }

    /**
     * Verify payment status
     * @param {string} transactionId - Transaction ID
     * @returns {Promise<Payment>}
     */
    static async verifyPayment(transactionId) {
        try {
            const response = await this.simulateAPICall(`/verify/${transactionId}`, 'GET');

            if (response.success) {
                const payment = Payment.fromAPI(response.data);
                console.log('🔍 Payment verified:', payment.transactionId);
                return payment;
            } else {
                throw new Error(response.message || 'Payment verification failed');
            }
        } catch (error) {
            console.error('❌ Payment verification failed:', error);
            throw error;
        }
    }

    /**
     * Refund payment
     * @param {string} transactionId - Transaction ID
     * @param {number} amount - Refund amount
     * @param {string} reason - Refund reason
     * @returns {Promise<Payment>}
     */
    static async refundPayment(transactionId, amount, reason) {
        try {
            const requestData = {
                transactionId,
                amount,
                reason: reason || 'Customer requested refund'
            };

            const response = await this.simulateAPICall('/refund', 'POST', requestData);

            if (response.success) {
                const payment = Payment.fromAPI(response.data);
                console.log('💰 Payment refunded:', payment.transactionId);
                return payment;
            } else {
                throw new Error(response.message || 'Refund processing failed');
            }
        } catch (error) {
            console.error('❌ Refund processing failed:', error);
            throw error;
        }
    }

    /**
     * Get payment history
     * @param {string} bookingId - Booking ID
     * @returns {Promise<Payment[]>}
     */
    static async getPaymentHistory(bookingId) {
        try {
            const response = await this.simulateAPICall(`/history/${bookingId}`, 'GET');

            if (response.success) {
                const payments = response.data.map(p => Payment.fromAPI(p));
                console.log(`📋 Found ${payments.length} payments for booking ${bookingId}`);
                return payments;
            } else {
                throw new Error(response.message || 'Failed to fetch payment history');
            }
        } catch (error) {
            console.error('❌ Failed to fetch payment history:', error);
            throw error;
        }
    }

    /**
     * Simulate API call (replace with actual fetch calls)
     */
    static async simulateAPICall(endpoint, method, data = null) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));

        // Simulate success (85% success rate)
        const isSuccess = Math.random() < 0.85;

        if (!isSuccess) {
            const errorMessages = [
                'Payment gateway timeout',
                'Insufficient funds',
                'Transaction declined by bank',
                'Network error - please try again'
            ];
            const errorMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];
            return {
                success: false,
                message: errorMessage
            };
        }

        // Generate mock response data
        const mockData = {
            paymentId: Math.floor(Math.random() * 100000),
            bookingId: data?.bookingId || Math.floor(Math.random() * 10000),
            amount: data?.amount || 500,
            taxAmount: (data?.amount || 500) * PAYMENT_CONFIG.TAX_RATE,
            serviceCharge: PAYMENT_CONFIG.SERVICE_CHARGE,
            totalAmount: (data?.amount || 500) + (data?.amount || 500) * PAYMENT_CONFIG.TAX_RATE + PAYMENT_CONFIG.SERVICE_CHARGE,
            paymentMethod: data?.paymentMethod || 'UPI',
            paymentStatus: 'Success',
            transactionId: new Payment().generateTransactionId(),
            paymentGateway: 'Razorpay',
            gatewayResponse: {
                status: 'success',
                reference_id: `REF-${Date.now()}`,
                bank_transaction_id: `BANK-${Math.random().toString(36).substring(7)}`
            },
            cardLastFour: data?.cardNumber ? data.cardNumber.slice(-4) : null,
            cardType: data?.cardNumber ? new Payment().detectCardType(data.cardNumber) : null,
            upiId: data?.upiId || null,
            bankName: data?.bankName || null,
            paymentDate: new Date().toISOString(),
            customerEmail: data?.customerEmail || 'customer@example.com',
            customerPhone: data?.customerPhone || '9876543210',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // For refund endpoint
        if (endpoint === '/refund') {
            mockData.paymentStatus = 'Refunded';
            mockData.refundAmount = data?.amount || mockData.amount;
            mockData.refundDate = new Date().toISOString();
            mockData.refundReason = data?.reason || 'Customer requested refund';
        }

        return {
            success: true,
            data: mockData,
            message: 'Payment processed successfully'
        };
    }
}

// ============================================================
// PAYMENT UI CONTROLLER
// ============================================================

class PaymentUIController {
    constructor() {
        this.currentPayment = null;
        this.isProcessing = false;
        this.retryCount = 0;
    }

    /**
     * Initialize payment UI
     */
    init() {
        this.setupEventListeners();
        this.setupPaymentMethodToggle();
        this.loadSavedPaymentDetails();
        console.log('💰 Payment UI Controller initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Payment form submit
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => this.handlePaymentSubmit(e));
        }

        // Payment method change
        document.querySelectorAll('input[name="paymentMethod"]').forEach(input => {
            input.addEventListener('change', (e) => this.handleMethodChange(e.target.value));
        });

        // Retry payment
        const retryBtn = document.getElementById('retryPaymentBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.handleRetry());
        }

        // Clear payment details
        const clearBtn = document.getElementById('clearPaymentBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearPaymentDetails());
        }
    }

    /**
     * Setup payment method toggle
     */
    setupPaymentMethodToggle() {
        const methodSelect = document.getElementById('paymentMethodSelect');
        if (methodSelect) {
            methodSelect.addEventListener('change', (e) => {
                this.handleMethodChange(e.target.value);
            });
        }
    }

    /**
     * Handle payment method change
     */
    handleMethodChange(method) {
        // Show/hide relevant fields
        const cardFields = document.getElementById('cardFields');
        const upiFields = document.getElementById('upiFields');
        const netBankingFields = document.getElementById('netBankingFields');
        const walletFields = document.getElementById('walletFields');

        // Hide all
        if (cardFields) cardFields.style.display = 'none';
        if (upiFields) upiFields.style.display = 'none';
        if (netBankingFields) netBankingFields.style.display = 'none';
        if (walletFields) walletFields.style.display = 'none';

        // Show relevant
        switch (method) {
            case 'Credit Card':
            case 'Debit Card':
                if (cardFields) cardFields.style.display = 'block';
                this.updateCardTypeIcon();
                break;
            case 'UPI':
                if (upiFields) upiFields.style.display = 'block';
                break;
            case 'Net Banking':
                if (netBankingFields) netBankingFields.style.display = 'block';
                break;
            case 'Wallet':
                if (walletFields) walletFields.style.display = 'block';
                break;
        }

        // Update payment method in state
        if (this.currentPayment) {
            this.currentPayment.paymentMethod = method;
        }
    }

    /**
     * Handle payment form submit
     */
    async handlePaymentSubmit(e) {
        e.preventDefault();

        if (this.isProcessing) {
            this.showNotification('Processing', 'Payment is already in progress...', 'info');
            return;
        }

        try {
            this.isProcessing = true;
            this.showLoading('Processing payment...');

            // Collect payment details
            const paymentData = this.getPaymentData();

            // Create payment object
            const payment = new Payment(paymentData);

            // Validate
            const validation = payment.validate();
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Process payment
            const processedPayment = await PaymentAPI.processPayment(payment);
            this.currentPayment = processedPayment;

            // Display success
            this.showPaymentSuccess(processedPayment);

            // Save for future use
            this.savePaymentDetails(paymentData);

            this.showNotification(
                'Payment Successful! 🎉',
                `Transaction ${processedPayment.transactionId} completed successfully.`,
                'success'
            );

            // Redirect to confirmation
            setTimeout(() => {
                window.location.href = 'booking-confirmation.html';
            }, 3000);

        } catch (error) {
            console.error('Payment error:', error);
            this.showPaymentError(error.message);
            this.showNotification('Payment Failed', error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.hideLoading();
        }
    }

    /**
     * Get payment data from form
     */
    getPaymentData() {
        const method = document.getElementById('paymentMethodSelect')?.value || 'UPI';
        let data = {
            bookingId: parseInt(document.getElementById('bookingId')?.value) || null,
            amount: parseFloat(document.getElementById('amount')?.value) || 0,
            paymentMethod: method,
            customerEmail: document.getElementById('customerEmail')?.value || '',
            customerPhone: document.getElementById('customerPhone')?.value || '',
            billingAddress: document.getElementById('billingAddress')?.value || ''
        };

        // Add method-specific data
        switch (method) {
            case 'Credit Card':
            case 'Debit Card':
                data.cardNumber = document.getElementById('cardNumber')?.value?.replace(/\s/g, '') || '';
                data.cardExpiry = document.getElementById('cardExpiry')?.value || '';
                data.cardCvv = document.getElementById('cardCvv')?.value || '';
                break;
            case 'UPI':
                data.upiId = document.getElementById('upiId')?.value || '';
                break;
            case 'Net Banking':
                data.bankName = document.getElementById('bankName')?.value || '';
                break;
            case 'Wallet':
                data.walletType = document.getElementById('walletType')?.value || '';
                break;
        }

        return data;
    }

    /**
     * Update card type icon
     */
    updateCardTypeIcon() {
        const cardNumber = document.getElementById('cardNumber')?.value || '';
        const cardIcon = document.getElementById('cardTypeIcon');
        if (!cardIcon) return;

        if (cardNumber.length > 0) {
            const payment = new Payment();
            const type = payment.detectCardType(cardNumber);
            const icons = {
                'Visa': '💳',
                'Mastercard': '💳',
                'RuPay': '💳',
                'Amex': '💳',
                'Unknown': '💳'
            };
            cardIcon.textContent = icons[type] || '💳';
        }
    }

    /**
     * Show payment success
     */
    showPaymentSuccess(payment) {
        const container = document.getElementById('paymentResult');
        if (!container) return;

        container.innerHTML = `
            <div class="payment-success">
                <div class="success-icon">✅</div>
                <h3>Payment Successful!</h3>
                <p>Transaction ID: <strong>${payment.transactionId}</strong></p>
                <p>Amount: <strong>${payment.formatAmount()}</strong></p>
                <p>Method: <strong>${payment.getMethodDisplayName()}</strong></p>
                <p>Status: <span class="badge badge-success">${payment.paymentStatus}</span></p>
                <button class="btn btn-primary" onclick="window.location.href='booking-confirmation.html'">
                    View Booking
                </button>
            </div>
        `;
        container.style.display = 'block';
    }

    /**
     * Show payment error
     */
    showPaymentError(message) {
        const container = document.getElementById('paymentResult');
        if (!container) return;

        container.innerHTML = `
            <div class="payment-error">
                <div class="error-icon">❌</div>
                <h3>Payment Failed</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="window.paymentUI.handleRetry()">
                    🔄 Retry Payment
                </button>
                <button class="btn btn-secondary" onclick="window.location.href='seat-selection.html'">
                    ← Back to Seats
                </button>
            </div>
        `;
        container.style.display = 'block';
    }

    /**
     * Handle retry
     */
    async handleRetry() {
        if (this.retryCount >= PAYMENT_CONFIG.MAX_RETRY_ATTEMPTS) {
            this.showNotification(
                'Max Retries Exceeded',
                'Please try again later or contact support.',
                'error'
            );
            return;
        }

        this.retryCount++;
        this.showNotification(
            'Retrying Payment',
            `Attempt ${this.retryCount} of ${PAYMENT_CONFIG.MAX_RETRY_ATTEMPTS}...`,
            'info'
        );

        // Re-submit form
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.dispatchEvent(new Event('submit'));
        }
    }

    /**
     * Save payment details for future use
     */
    savePaymentDetails(data) {
        try {
            const saved = JSON.parse(localStorage.getItem('paymentDetails') || '{}');
            const updated = {
                ...saved,
                email: data.customerEmail || saved.email,
                phone: data.customerPhone || saved.phone,
                billingAddress: data.billingAddress || saved.billingAddress,
                lastUsed: new Date().toISOString()
            };
            localStorage.setItem('paymentDetails', JSON.stringify(updated));
        } catch (e) {
            console.warn('Failed to save payment details');
        }
    }

    /**
     * Load saved payment details
     */
    loadSavedPaymentDetails() {
        try {
            const saved = JSON.parse(localStorage.getItem('paymentDetails') || '{}');
            if (saved.email) {
                const emailField = document.getElementById('customerEmail');
                if (emailField && !emailField.value) {
                    emailField.value = saved.email;
                }
            }
            if (saved.phone) {
                const phoneField = document.getElementById('customerPhone');
                if (phoneField && !phoneField.value) {
                    phoneField.value = saved.phone;
                }
            }
            if (saved.billingAddress) {
                const addressField = document.getElementById('billingAddress');
                if (addressField && !addressField.value) {
                    addressField.value = saved.billingAddress;
                }
            }
        } catch (e) {
            console.warn('Failed to load saved payment details');
        }
    }

    /**
     * Clear payment details
     */
    clearPaymentDetails() {
        if (!confirm('Clear all payment details?')) return;

        localStorage.removeItem('paymentDetails');
        document.querySelectorAll('#paymentForm input, #paymentForm textarea').forEach(input => {
            input.value = '';
        });
        this.showNotification('Cleared', 'Payment details cleared successfully.', 'info');
    }

    /**
     * Show notification
     */
    showNotification(title, message, type = 'info') {
        const container = document.getElementById('paymentNotifications');
        if (!container) {
            alert(`${title}: ${message}`);
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-icon">${this.getNotificationIcon(type)}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    /**
     * Get notification icon
     */
    getNotificationIcon(type) {
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    /**
     * Show loading state
     */
    showLoading(message) {
        const overlay = document.getElementById('paymentLoading');
        if (overlay) {
            overlay.querySelector('.loading-message').textContent = message;
            overlay.style.display = 'flex';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const overlay = document.getElementById('paymentLoading');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

// ============================================================
// EXPORT AND INITIALIZE
// ============================================================

// Create global instance
const paymentUI = new PaymentUIController();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    paymentUI.init();
    console.log('💰 Payment module loaded successfully');
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Payment,
        PaymentAPI,
        PaymentUIController,
        PAYMENT_CONFIG
    };
}