/**
 * ============================================================
 * BOOKING.JS - Complete Booking Management Module
 * Version: 1.0.0
 * Author: CineWave Entertainment
 * Description: Handles booking creation, confirmation, 
 *              cancellation, and status management
 * ============================================================
 */

// ============================================================
// CONFIGURATION
// ============================================================

const BOOKING_CONFIG = {
    API_BASE_URL: 'http://localhost:8080/api',  // Update with your API URL
    AUTO_CANCEL_MINUTES: 15,
    MAX_SEATS_PER_BOOKING: 10,
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 2000,
};

// ============================================================
// BOOKING CLASS
// ============================================================

class Booking {
    /**
     * Create a new booking instance
     * @param {Object} data - Booking data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.reference = data.reference || this.generateReference();
        this.customerName = data.customerName || '';
        this.customerEmail = data.customerEmail || '';
        this.customerPhone = data.customerPhone || '';
        this.customerAge = data.customerAge || null;
        this.showId = data.showId || null;
        this.selectedSeats = data.selectedSeats || [];
        this.totalTickets = data.totalTickets || 0;
        this.totalAmount = data.totalAmount || 0;
        this.baseAmount = data.baseAmount || 0;
        this.discountAmount = data.discountAmount || 0;
        this.couponCode = data.couponCode || null;
        this.bookingStatus = data.bookingStatus || 'Pending';
        this.confirmationStatus = data.confirmationStatus || 'Awaiting';
        this.paymentStatus = data.paymentStatus || 'Pending';
        this.paymentMethod = data.paymentMethod || null;
        this.transactionId = data.transactionId || null;
        this.qrCode = data.qrCode || null;
        this.ticketPdfUrl = data.ticketPdfUrl || null;
        this.bookingDate = data.bookingDate || new Date().toISOString();
        this.confirmationDate = data.confirmationDate || null;
        this.paymentDate = data.paymentDate || null;
        this.cancellationDate = data.cancellationDate || null;
        this.expiryDate = data.expiryDate || this.calculateExpiryDate();
        this.specialRequests = data.specialRequests || '';
        this.isGuestBooking = data.isGuestBooking || false;
        this.staffNotes = data.staffNotes || '';
        this.cancellationReason = data.cancellationReason || '';
        this.showDetails = data.showDetails || null;
        this.foodOrder = data.foodOrder || [];
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Generate unique booking reference
     * Format: BK-YYYY-MM-DD-XXXX
     */
    generateReference() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        return `BK-${year}-${month}-${day}-${random}`;
    }

    /**
     * Calculate expiry date (15 minutes from now)
     */
    calculateExpiryDate() {
        const now = new Date();
        now.setMinutes(now.getMinutes() + BOOKING_CONFIG.AUTO_CANCEL_MINUTES);
        return now.toISOString();
    }

    /**
     * Check if booking is expired
     */
    isExpired() {
        const now = new Date();
        const expiry = new Date(this.expiryDate);
        return now > expiry;
    }

    /**
     * Check if booking can be confirmed
     */
    canConfirm() {
        return this.bookingStatus === 'Pending' &&
               this.confirmationStatus === 'Awaiting' &&
               !this.isExpired() &&
               this.selectedSeats.length > 0 &&
               this.paymentStatus === 'Pending';
    }

    /**
     * Check if booking can be cancelled
     */
    canCancel() {
        return ['Pending', 'Confirmed'].includes(this.bookingStatus) &&
               this.bookingStatus !== 'Cancelled' &&
               this.bookingStatus !== 'Rejected';
    }

    /**
     * Get booking progress percentage
     */
    getProgressPercentage() {
        const statuses = {
            'Pending': 25,
            'Confirmed': 50,
            'Paid': 75,
            'Completed': 100,
            'Cancelled': 0,
            'Rejected': 0
        };
        return statuses[this.bookingStatus] || 0;
    }

    /**
     * Get formatted booking status
     */
    getFormattedStatus() {
        const statusMap = {
            'Pending': 'Pending Confirmation',
            'Confirmed': 'Confirmed',
            'Completed': 'Completed',
            'Cancelled': 'Cancelled',
            'Rejected': 'Rejected'
        };
        return statusMap[this.bookingStatus] || this.bookingStatus;
    }

    /**
     * Get status color for UI
     */
    getStatusColor() {
        const colorMap = {
            'Pending': '#fdcb6e',
            'Confirmed': '#00b894',
            'Completed': '#0984e3',
            'Cancelled': '#e17055',
            'Rejected': '#d63031'
        };
        return colorMap[this.bookingStatus] || '#bdbdbd';
    }

    /**
     * Validate booking data
     */
    validate() {
        const errors = [];

        // Check customer name
        if (!this.customerName || this.customerName.trim().length < 2) {
            errors.push('Customer name is required (minimum 2 characters)');
        }

        // Check email
        if (!this.customerEmail || !this.isValidEmail(this.customerEmail)) {
            errors.push('Valid email address is required');
        }

        // Check phone
        if (!this.customerPhone || !this.isValidPhone(this.customerPhone)) {
            errors.push('Valid 10-digit phone number is required');
        }

        // Check show
        if (!this.showId) {
            errors.push('Show selection is required');
        }

        // Check seats
        if (this.selectedSeats.length === 0) {
            errors.push('At least one seat must be selected');
        }

        if (this.selectedSeats.length > BOOKING_CONFIG.MAX_SEATS_PER_BOOKING) {
            errors.push(`Maximum ${BOOKING_CONFIG.MAX_SEATS_PER_BOOKING} seats allowed per booking`);
        }

        // Check age for A-rated movies
        if (this.customerAge !== null && this.customerAge < 18) {
            errors.push('Customer must be 18+ for A-rated movies');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return regex.test(email);
    }

    /**
     * Validate phone number (Indian format)
     */
    isValidPhone(phone) {
        const regex = /^[0-9]{10}$/;
        return regex.test(phone);
    }

    /**
     * Apply coupon discount
     */
    applyCoupon(couponCode) {
        this.couponCode = couponCode;
        let discount = 0;

        switch (couponCode.toUpperCase()) {
            case 'B1G1':
                if (this.selectedSeats.length >= 2) {
                    const halfPrice = this.baseAmount / 2;
                    discount = halfPrice;
                }
                break;
            case 'MUNCH50':
                discount = this.baseAmount * 0.10; // 10% discount
                break;
            case 'WELCOME10':
                discount = this.baseAmount * 0.10;
                break;
            default:
                discount = 0;
        }

        this.discountAmount = Math.min(discount, this.baseAmount * 0.50); // Max 50% discount
        this.totalAmount = this.baseAmount - this.discountAmount;
        return this.discountAmount;
    }

    /**
     * Add food items to booking
     */
    addFoodItems(foodItems) {
        if (!Array.isArray(foodItems)) {
            throw new Error('Food items must be an array');
        }

        this.foodOrder = foodItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            category: item.category || 'snacks'
        }));

        // Update total amount with food
        const foodTotal = this.foodOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        this.totalAmount += foodTotal;
    }

    /**
     * Generate QR Code data
     */
    generateQRData() {
        return {
            bookingId: this.id,
            reference: this.reference,
            customerName: this.customerName,
            showDetails: this.showDetails,
            seats: this.selectedSeats,
            totalAmount: this.totalAmount
        };
    }

    /**
     * Convert to plain object for API
     */
    toJSON() {
        return {
            reference: this.reference,
            customerName: this.customerName,
            customerEmail: this.customerEmail,
            customerPhone: this.customerPhone,
            customerAge: this.customerAge,
            showId: this.showId,
            selectedSeats: this.selectedSeats,
            totalTickets: this.selectedSeats.length,
            totalAmount: this.totalAmount,
            baseAmount: this.baseAmount,
            discountAmount: this.discountAmount,
            couponCode: this.couponCode,
            specialRequests: this.specialRequests,
            foodOrder: this.foodOrder,
            isGuestBooking: this.isGuestBooking
        };
    }

    /**
     * Create from API response
     */
    static fromAPI(data) {
        return new Booking({
            id: data.bookingId || data.id,
            reference: data.bookingReference || data.reference,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
            customerAge: data.customerAge,
            showId: data.showId,
            selectedSeats: data.selectedSeats || data.seats || [],
            totalTickets: data.totalTickets || data.totalSeats || 0,
            totalAmount: data.totalAmount || data.amount || 0,
            baseAmount: data.baseAmount || 0,
            discountAmount: data.discountAmount || 0,
            couponCode: data.couponCode,
            bookingStatus: data.bookingStatus || data.status || 'Pending',
            confirmationStatus: data.confirmationStatus || 'Awaiting',
            paymentStatus: data.paymentStatus || 'Pending',
            paymentMethod: data.paymentMethod,
            transactionId: data.transactionId,
            qrCode: data.qrCode,
            ticketPdfUrl: data.ticketPdfUrl,
            bookingDate: data.bookingDate,
            confirmationDate: data.confirmationDate,
            paymentDate: data.paymentDate,
            cancellationDate: data.cancellationDate,
            expiryDate: data.expiryDate,
            specialRequests: data.specialRequests,
            showDetails: data.showDetails,
            foodOrder: data.foodOrder || [],
            isGuestBooking: data.isGuestBooking || false,
            staffNotes: data.staffNotes,
            cancellationReason: data.cancellationReason,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
    }
}

// ============================================================
// BOOKING API SERVICE
// ============================================================

class BookingAPI {
    /**
     * Create a new booking
     * @param {Booking} booking - Booking instance
     * @returns {Promise<Booking>}
     */
    static async createBooking(booking) {
        try {
            // Validate booking
            const validation = booking.validate();
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            // Prepare request data
            const requestData = booking.toJSON();

            // Simulate API call
            const response = await this.simulateAPICall('/bookings', 'POST', requestData);

            if (response.success) {
                const createdBooking = Booking.fromAPI(response.data);
                console.log('✅ Booking created:', createdBooking.reference);
                return createdBooking;
            } else {
                throw new Error(response.message || 'Failed to create booking');
            }
        } catch (error) {
            console.error('❌ Booking creation failed:', error);
            throw error;
        }
    }

    /**
     * Confirm a booking
     * @param {number|string} bookingId - Booking ID or reference
     * @param {Object} paymentData - Payment details
     * @returns {Promise<Booking>}
     */
    static async confirmBooking(bookingId, paymentData) {
        try {
            const requestData = {
                bookingId: bookingId,
                paymentMethod: paymentData.method,
                transactionId: paymentData.transactionId || this.generateTransactionId(),
                paymentDetails: paymentData.details || {}
            };

            const response = await this.simulateAPICall('/bookings/confirm', 'POST', requestData);

            if (response.success) {
                const confirmedBooking = Booking.fromAPI(response.data);
                console.log('✅ Booking confirmed:', confirmedBooking.reference);
                return confirmedBooking;
            } else {
                throw new Error(response.message || 'Failed to confirm booking');
            }
        } catch (error) {
            console.error('❌ Booking confirmation failed:', error);
            throw error;
        }
    }

    /**
     * Cancel a booking
     * @param {number|string} bookingId - Booking ID or reference
     * @param {string} reason - Cancellation reason
     * @returns {Promise<Booking>}
     */
    static async cancelBooking(bookingId, reason) {
        try {
            const requestData = {
                bookingId: bookingId,
                reason: reason || 'User requested cancellation'
            };

            const response = await this.simulateAPICall('/bookings/cancel', 'POST', requestData);

            if (response.success) {
                const cancelledBooking = Booking.fromAPI(response.data);
                console.log('✅ Booking cancelled:', cancelledBooking.reference);
                return cancelledBooking;
            } else {
                throw new Error(response.message || 'Failed to cancel booking');
            }
        } catch (error) {
            console.error('❌ Booking cancellation failed:', error);
            throw error;
        }
    }

    /**
     * Get booking details
     * @param {number|string} bookingId - Booking ID or reference
     * @returns {Promise<Booking>}
     */
    static async getBooking(bookingId) {
        try {
            const response = await this.simulateAPICall(`/bookings/${bookingId}`, 'GET');

            if (response.success) {
                const booking = Booking.fromAPI(response.data);
                console.log('📋 Booking details fetched:', booking.reference);
                return booking;
            } else {
                throw new Error(response.message || 'Failed to fetch booking');
            }
        } catch (error) {
            console.error('❌ Failed to fetch booking:', error);
            throw error;
        }
    }

    /**
     * Get all bookings for a user
     * @param {string} email - Customer email
     * @returns {Promise<Booking[]>}
     */
    static async getUserBookings(email) {
        try {
            const response = await this.simulateAPICall(`/bookings?email=${encodeURIComponent(email)}`, 'GET');

            if (response.success) {
                const bookings = response.data.map(b => Booking.fromAPI(b));
                console.log(`📋 Found ${bookings.length} bookings for ${email}`);
                return bookings;
            } else {
                throw new Error(response.message || 'Failed to fetch bookings');
            }
        } catch (error) {
            console.error('❌ Failed to fetch user bookings:', error);
            throw error;
        }
    }

    /**
     * Auto-cancel expired bookings (SLA)
     * @returns {Promise<number>} - Number of cancellations
     */
    static async autoCancelExpired() {
        try {
            const response = await this.simulateAPICall('/bookings/auto-cancel', 'POST');

            if (response.success) {
                console.log(`🕐 Auto-cancelled ${response.data.count} expired bookings`);
                return response.data.count;
            } else {
                throw new Error(response.message || 'Failed to auto-cancel bookings');
            }
        } catch (error) {
            console.error('❌ Auto-cancellation failed:', error);
            throw error;
        }
    }

    /**
     * Generate transaction ID
     */
    static generateTransactionId() {
        const prefix = 'TXN';
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Simulate API call (replace with actual fetch calls)
     */
    static async simulateAPICall(endpoint, method, data = null) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

        // Simulate success (90% success rate)
        const isSuccess = Math.random() < 0.9;

        if (!isSuccess) {
            return {
                success: false,
                message: 'Simulated API error: Service temporarily unavailable'
            };
        }

        // Generate mock response data
        const mockData = {
            bookingId: Math.floor(Math.random() * 10000),
            bookingReference: `BK-${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}-${String(Math.floor(Math.random()*10000)).padStart(4,'0')}`,
            customerName: data?.customerName || 'John Doe',
            customerEmail: data?.customerEmail || 'john@example.com',
            customerPhone: data?.customerPhone || '9876543210',
            customerAge: data?.customerAge || 25,
            showId: data?.showId || 1,
            selectedSeats: data?.selectedSeats || ['A04', 'A05', 'A06'],
            totalTickets: data?.selectedSeats?.length || 3,
            totalAmount: data?.totalAmount || 660,
            baseAmount: data?.baseAmount || 660,
            discountAmount: data?.discountAmount || 0,
            couponCode: data?.couponCode || null,
            bookingStatus: 'Pending',
            confirmationStatus: 'Awaiting',
            paymentStatus: 'Pending',
            bookingDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            showDetails: {
                movieTitle: 'Toxic: A Fairy Tale for Grown-ups',
                theatreName: 'INOX: Reliance Mega Mall, Kolhapur',
                showDate: '2026-08-30',
                showTime: '08:00 AM'
            },
            foodOrder: data?.foodOrder || []
        };

        // If confirming, update status
        if (endpoint === '/bookings/confirm') {
            mockData.bookingStatus = 'Confirmed';
            mockData.confirmationStatus = 'Confirmed';
            mockData.paymentStatus = 'Paid';
            mockData.paymentMethod = data?.paymentMethod || 'UPI';
            mockData.transactionId = data?.transactionId || this.generateTransactionId();
            mockData.confirmationDate = new Date().toISOString();
            mockData.paymentDate = new Date().toISOString();
            mockData.qrCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'; // Simulated QR
        }

        // If cancelling, update status
        if (endpoint === '/bookings/cancel') {
            mockData.bookingStatus = 'Cancelled';
            mockData.confirmationStatus = 'Cancelled';
            mockData.cancellationDate = new Date().toISOString();
            mockData.cancellationReason = data?.reason || 'User requested cancellation';
        }

        // If auto-cancelling
        if (endpoint === '/bookings/auto-cancel') {
            return {
                success: true,
                data: { count: Math.floor(Math.random() * 5) }
            };
        }

        return {
            success: true,
            data: mockData,
            message: 'Operation successful'
        };
    }
}

// ============================================================
// BOOKING UI CONTROLLER
// ============================================================

class BookingUIController {
    constructor() {
        this.currentBooking = null;
        this.autoCancelTimer = null;
        this.bookingHistory = [];
    }

    /**
     * Initialize booking UI
     */
    init() {
        this.setupEventListeners();
        this.checkForExistingBooking();
        this.startAutoCancelTimer();
        console.log('📋 Booking UI Controller initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Booking form submit
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Confirm booking button
        const confirmBtn = document.getElementById('confirmBookingBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.handleConfirm());
        }

        // Cancel booking button
        const cancelBtn = document.getElementById('cancelBookingBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.handleCancel());
        }

        // Auto-cancel status check
        setInterval(() => this.checkBookingStatus(), 5000);
    }

    /**
     * Check for existing booking in localStorage
     */
    checkForExistingBooking() {
        try {
            const savedData = localStorage.getItem('currentBooking');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.currentBooking = new Booking(data);
                this.renderBookingDetails();
                
                // Check if booking is expired
                if (this.currentBooking.isExpired() && this.currentBooking.bookingStatus === 'Pending') {
                    this.handleAutoCancel();
                }
            }
        } catch (e) {
            console.warn('No existing booking found');
        }
    }

    /**
     * Start auto-cancel timer
     */
    startAutoCancelTimer() {
        this.autoCancelTimer = setInterval(() => {
            if (this.currentBooking && this.currentBooking.bookingStatus === 'Pending') {
                const remaining = this.getRemainingTime();
                this.updateCountdown(remaining);
                
                if (remaining <= 0) {
                    this.handleAutoCancel();
                }
            }
        }, 1000);
    }

    /**
     * Get remaining time in seconds
     */
    getRemainingTime() {
        if (!this.currentBooking) return 0;
        const now = new Date();
        const expiry = new Date(this.currentBooking.expiryDate);
        return Math.max(0, Math.floor((expiry - now) / 1000));
    }

    /**
     * Update countdown display
     */
    updateCountdown(seconds) {
        const timerElement = document.getElementById('bookingTimer');
        if (!timerElement) return;

        if (seconds > 0) {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timerElement.textContent = `${minutes}:${String(secs).padStart(2, '0')}`;
            timerElement.style.color = seconds < 60 ? '#e17055' : '#00b894';
        } else {
            timerElement.textContent = 'Expired';
            timerElement.style.color = '#e17055';
        }
    }

    /**
     * Handle booking form submit
     */
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = this.getFormData();
        const booking = new Booking(formData);
        
        // Validate
        const validation = booking.validate();
        if (!validation.isValid) {
            this.showNotification('Validation Error', validation.errors.join(', '), 'error');
            return;
        }

        try {
            this.showLoading('Creating booking...');
            
            // Create booking
            const createdBooking = await BookingAPI.createBooking(booking);
            this.currentBooking = createdBooking;
            
            // Save to localStorage
            localStorage.setItem('currentBooking', JSON.stringify(createdBooking));
            
            this.renderBookingDetails();
            this.showNotification(
                'Booking Created!',
                `Your booking ${createdBooking.reference} has been created. Please confirm within 15 minutes.`,
                'success'
            );
        } catch (error) {
            this.showNotification('Error', error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Handle booking confirmation
     */
    async handleConfirm() {
        if (!this.currentBooking) {
            this.showNotification('Error', 'No booking to confirm', 'error');
            return;
        }

        if (!this.currentBooking.canConfirm()) {
            this.showNotification('Error', 'Booking cannot be confirmed', 'error');
            return;
        }

        try {
            this.showLoading('Confirming booking...');
            
            // Get payment details
            const paymentDetails = this.getPaymentDetails();
            if (!paymentDetails) {
                throw new Error('Payment details required');
            }

            // Confirm booking
            const confirmedBooking = await BookingAPI.confirmBooking(
                this.currentBooking.id,
                paymentDetails
            );
            
            this.currentBooking = confirmedBooking;
            localStorage.setItem('currentBooking', JSON.stringify(confirmedBooking));
            
            this.renderBookingDetails();
            this.showNotification(
                'Booking Confirmed! 🎉',
                `Your booking ${confirmedBooking.reference} is confirmed. E-ticket has been sent.`,
                'success'
            );
            
            // Navigate to confirmation page
            setTimeout(() => {
                window.location.href = 'booking-confirmation.html';
            }, 2000);
        } catch (error) {
            this.showNotification('Error', error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Handle booking cancellation
     */
    async handleCancel() {
        if (!this.currentBooking) {
            this.showNotification('Error', 'No booking to cancel', 'error');
            return;
        }

        if (!this.currentBooking.canCancel()) {
            this.showNotification('Error', 'Booking cannot be cancelled', 'error');
            return;
        }

        const confirmCancel = confirm(
            `Are you sure you want to cancel booking ${this.currentBooking.reference}?`
        );
        
        if (!confirmCancel) return;

        try {
            this.showLoading('Cancelling booking...');
            
            const reason = prompt('Reason for cancellation (optional):');
            
            const cancelledBooking = await BookingAPI.cancelBooking(
                this.currentBooking.id,
                reason || 'User requested cancellation'
            );
            
            this.currentBooking = cancelledBooking;
            localStorage.setItem('currentBooking', JSON.stringify(cancelledBooking));
            
            this.renderBookingDetails();
            this.showNotification(
                'Booking Cancelled',
                `Booking ${cancelledBooking.reference} has been cancelled.`,
                'warning'
            );
        } catch (error) {
            this.showNotification('Error', error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Handle auto-cancellation
     */
    async handleAutoCancel() {
        if (!this.currentBooking) return;
        
        try {
            const cancelledBooking = await BookingAPI.cancelBooking(
                this.currentBooking.id,
                'Auto-cancelled: Confirmation timeout (15 minutes)'
            );
            
            this.currentBooking = cancelledBooking;
            localStorage.setItem('currentBooking', JSON.stringify(cancelledBooking));
            
            this.renderBookingDetails();
            this.showNotification(
                'Booking Expired',
                `Booking ${cancelledBooking.reference} was auto-cancelled due to timeout.`,
                'warning'
            );
        } catch (error) {
            console.error('Auto-cancellation failed:', error);
        }
    }

    /**
     * Check booking status periodically
     */
    async checkBookingStatus() {
        if (!this.currentBooking) return;
        
        try {
            const booking = await BookingAPI.getBooking(this.currentBooking.id);
            this.currentBooking = booking;
            localStorage.setItem('currentBooking', JSON.stringify(booking));
            this.renderBookingDetails();
        } catch (error) {
            // Silent fail for status checks
        }
    }

    /**
     * Render booking details in UI
     */
    renderBookingDetails() {
        const container = document.getElementById('bookingDetails');
        if (!container || !this.currentBooking) return;

        const booking = this.currentBooking;
        
        container.innerHTML = `
            <div class="booking-card">
                <div class="booking-header">
                    <div class="booking-ref">
                        <span class="label">Booking ID</span>
                        <span class="value">${booking.reference}</span>
                    </div>
                    <div class="booking-status">
                        <span class="status-badge" style="background: ${booking.getStatusColor()}">
                            ${booking.getFormattedStatus()}
                        </span>
                    </div>
                </div>
                
                <div class="booking-details-grid">
                    <div class="detail-item">
                        <span class="label">Customer</span>
                        <span class="value">${booking.customerName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Email</span>
                        <span class="value">${booking.customerEmail}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Phone</span>
                        <span class="value">${booking.customerPhone}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Seats</span>
                        <span class="value">${booking.selectedSeats.join(', ')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Total Amount</span>
                        <span class="value highlight">₹${booking.totalAmount}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Payment Status</span>
                        <span class="value">${booking.paymentStatus}</span>
                    </div>
                </div>
                
                ${booking.showDetails ? `
                    <div class="show-details">
                        <h4>Show Details</h4>
                        <p>${booking.showDetails.movieTitle}</p>
                        <p>${booking.showDetails.theatreName}</p>
                        <p>${booking.showDetails.showDate} at ${booking.showDetails.showTime}</p>
                    </div>
                ` : ''}
                
                <div class="booking-timer">
                    <span>⏱️ Time to confirm: </span>
                    <span id="bookingTimer">${this.formatTime(this.getRemainingTime())}</span>
                </div>
                
                <div class="booking-actions">
                    ${booking.canConfirm() ? `
                        <button class="btn btn-success" onclick="window.bookingUI.handleConfirm()">
                            ✅ Confirm Booking
                        </button>
                    ` : ''}
                    ${booking.canCancel() ? `
                        <button class="btn btn-danger" onclick="window.bookingUI.handleCancel()">
                            ❌ Cancel Booking
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Format time for display
     */
    formatTime(seconds) {
        if (seconds <= 0) return 'Expired';
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }

    /**
     * Get form data
     */
    getFormData() {
        return {
            customerName: document.getElementById('customerName')?.value || '',
            customerEmail: document.getElementById('customerEmail')?.value || '',
            customerPhone: document.getElementById('customerPhone')?.value || '',
            customerAge: parseInt(document.getElementById('customerAge')?.value) || null,
            showId: parseInt(document.getElementById('showId')?.value) || null,
            selectedSeats: JSON.parse(document.getElementById('selectedSeats')?.value || '[]'),
            totalAmount: parseFloat(document.getElementById('totalAmount')?.value) || 0,
            baseAmount: parseFloat(document.getElementById('baseAmount')?.value) || 0,
            couponCode: document.getElementById('couponCode')?.value || null,
            specialRequests: document.getElementById('specialRequests')?.value || '',
            isGuestBooking: document.getElementById('isGuestBooking')?.checked || false
        };
    }

    /**
     * Get payment details
     */
    getPaymentDetails() {
        const method = document.getElementById('paymentMethod')?.value;
        if (!method) {
            this.showNotification('Error', 'Please select a payment method', 'error');
            return null;
        }

        return {
            method: method,
            details: {
                cardNumber: document.getElementById('cardNumber')?.value || null,
                expiryDate: document.getElementById('expiryDate')?.value || null,
                cvv: document.getElementById('cvv')?.value || null,
                upiId: document.getElementById('upiId')?.value || null
            }
        };
    }

    /**
     * Show notification
     */
    showNotification(title, message, type = 'info') {
        const container = document.getElementById('notificationContainer');
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
        
        // Auto-remove after 5 seconds
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
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.querySelector('.loading-message').textContent = message;
            overlay.style.display = 'flex';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

// ============================================================
// EXPORT AND INITIALIZE
// ============================================================

// Create global instance
const bookingUI = new BookingUIController();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    bookingUI.init();
    console.log('📋 Booking module loaded successfully');
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Booking,
        BookingAPI,
        BookingUIController,
        BOOKING_CONFIG
    };
}