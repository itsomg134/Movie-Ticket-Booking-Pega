/**
 * ============================================================
 * SEAT-SELECTION.JS - Complete Seat Selection Module
 * Version: 1.0.0
 * Author: CineWave Entertainment
 * Description: Handles seat map rendering, selection logic,
 *              validation, and UI interactions
 * ============================================================
 */

// ============================================================
// CONFIGURATION
// ============================================================

const SEAT_CONFIG = {
    MAX_SEATS: 10,
    MIN_SEATS: 1,
    ROWS: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
    COLS_PER_ROW: 15,
    SEAT_TYPES: {
        'Prime': { price: 220, color: '#ff6b6b', label: 'PRIME' },
        'Classic': { price: 200, color: '#00b894', label: 'CLASSIC' },
        'Recliner': { price: 350, color: '#6c5ce7', label: 'RECLINER' },
        'VIP': { price: 450, color: '#fdcb6e', label: 'VIP' }
    },
    RESERVATION_MINUTES: 15,
    BULK_DISCOUNT: {
        threshold: 5,
        discountPercent: 10
    }
};

// ============================================================
// SEAT CLASS
// ============================================================

class Seat {
    /**
     * Create a new seat instance
     * @param {Object} data - Seat data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.showId = data.showId || null;
        this.seatNumber = data.seatNumber || '';
        this.rowNumber = data.rowNumber || '';
        this.seatType = data.seatType || 'Classic';
        this.seatPrice = data.seatPrice || SEAT_CONFIG.SEAT_TYPES[this.seatType]?.price || 200;
        this.isAvailable = data.isAvailable !== undefined ? data.isAvailable : true;
        this.isReserved = data.isReserved || false;
        this.isSelected = data.isSelected || false;
        this.isBestseller = data.isBestseller || false;
        this.positionX = data.positionX || 0;
        this.positionY = data.positionY || 0;
        this.reservedUntil = data.reservedUntil || null;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Get seat display name
     */
    getDisplayName() {
        return `${this.rowNumber}${this.seatNumber}`;
    }

    /**
     * Get seat type details
     */
    getTypeDetails() {
        return SEAT_CONFIG.SEAT_TYPES[this.seatType] || SEAT_CONFIG.SEAT_TYPES['Classic'];
    }

    /**
     * Get status for display
     */
    getStatus() {
        if (this.isSelected) return 'selected';
        if (!this.isAvailable) return 'sold';
        if (this.isReserved) return 'reserved';
        if (this.isBestseller) return 'bestseller';
        return 'available';
    }

    /**
     * Get status label
     */
    getStatusLabel() {
        const labels = {
            'available': 'Available',
            'sold': 'Sold',
            'reserved': 'Reserved',
            'selected': 'Selected',
            'bestseller': 'Bestseller'
        };
        return labels[this.getStatus()] || 'Unknown';
    }

    /**
     * Check if seat can be selected
     */
    canSelect() {
        return this.isAvailable && !this.isReserved && !this.isSelected;
    }

    /**
     * Select seat
     */
    select() {
        if (this.canSelect()) {
            this.isSelected = true;
            this.isAvailable = false;
            return true;
        }
        return false;
    }

    /**
     * Deselect seat
     */
    deselect() {
        if (this.isSelected) {
            this.isSelected = false;
            this.isAvailable = true;
            return true;
        }
        return false;
    }

    /**
     * Reserve seat
     */
    reserve() {
        if (this.canSelect()) {
            this.isReserved = true;
            const now = new Date();
            now.setMinutes(now.getMinutes() + SEAT_CONFIG.RESERVATION_MINUTES);
            this.reservedUntil = now.toISOString();
            return true;
        }
        return false;
    }

    /**
     * Release reserved seat
     */
    release() {
        if (this.isReserved) {
            this.isReserved = false;
            this.reservedUntil = null;
            return true;
        }
        return false;
    }

    /**
     * Check if reservation has expired
     */
    isReservationExpired() {
        if (!this.isReserved || !this.reservedUntil) return false;
        const now = new Date();
        const expiry = new Date(this.reservedUntil);
        return now > expiry;
    }

    /**
     * Convert to plain object
     */
    toJSON() {
        return {
            id: this.id,
            showId: this.showId,
            seatNumber: this.seatNumber,
            rowNumber: this.rowNumber,
            seatType: this.seatType,
            seatPrice: this.seatPrice,
            isAvailable: this.isAvailable,
            isReserved: this.isReserved,
            isSelected: this.isSelected,
            isBestseller: this.isBestseller,
            positionX: this.positionX,
            positionY: this.positionY,
            reservedUntil: this.reservedUntil,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create from API response
     */
    static fromAPI(data) {
        return new Seat({
            id: data.seatId || data.id,
            showId: data.showId,
            seatNumber: data.seatNumber || data.number,
            rowNumber: data.rowNumber || data.row,
            seatType: data.seatType || data.type || 'Classic',
            seatPrice: data.seatPrice || data.price || 200,
            isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
            isReserved: data.isReserved || false,
            isSelected: data.isSelected || false,
            isBestseller: data.isBestseller || false,
            positionX: data.positionX || 0,
            positionY: data.positionY || 0,
            reservedUntil: data.reservedUntil || null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
    }
}

// ============================================================
// SEAT MAP CLASS
// ============================================================

class SeatMap {
    /**
     * Create a new seat map
     * @param {Object} data - Seat map data
     */
    constructor(data = {}) {
        this.showId = data.showId || null;
        this.theatreName = data.theatreName || '';
        this.screenName = data.screenName || '';
        this.seats = data.seats || [];
        this.totalSeats = this.seats.length;
        this.availableSeats = this.seats.filter(s => s.isAvailable).length;
        this.bookedSeats = this.seats.filter(s => !s.isAvailable && !s.isSelected).length;
        this.selectedSeats = this.seats.filter(s => s.isSelected);
        this.reservedSeats = this.seats.filter(s => s.isReserved);
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Add a seat to the map
     */
    addSeat(seat) {
        if (seat instanceof Seat) {
            this.seats.push(seat);
            this.updateCounts();
        }
    }

    /**
     * Remove a seat from the map
     */
    removeSeat(seatId) {
        this.seats = this.seats.filter(s => s.id !== seatId);
        this.updateCounts();
    }

    /**
     * Update seat counts
     */
    updateCounts() {
        this.totalSeats = this.seats.length;
        this.availableSeats = this.seats.filter(s => s.isAvailable).length;
        this.bookedSeats = this.seats.filter(s => !s.isAvailable && !s.isSelected && !s.isReserved).length;
        this.selectedSeats = this.seats.filter(s => s.isSelected);
        this.reservedSeats = this.seats.filter(s => s.isReserved);
    }

    /**
     * Find seat by ID
     */
    findSeat(seatId) {
        return this.seats.find(s => s.id === seatId);
    }

    /**
     * Find seat by number
     */
    findSeatByNumber(rowNumber, seatNumber) {
        return this.seats.find(s => s.rowNumber === rowNumber && s.seatNumber === seatNumber);
    }

    /**
     * Get seats by row
     */
    getSeatsByRow(rowNumber) {
        return this.seats.filter(s => s.rowNumber === rowNumber);
    }

    /**
     * Get seats by type
     */
    getSeatsByType(seatType) {
        return this.seats.filter(s => s.seatType === seatType);
    }

    /**
     * Get selected seat IDs
     */
    getSelectedSeatIds() {
        return this.selectedSeats.map(s => s.id);
    }

    /**
     * Get selected seat numbers
     */
    getSelectedSeatNumbers() {
        return this.selectedSeats.map(s => s.getDisplayName());
    }

    /**
     * Get total price of selected seats
     */
    getSelectedTotalPrice() {
        return this.selectedSeats.reduce((sum, seat) => sum + seat.seatPrice, 0);
    }

    /**
     * Get total count of selected seats
     */
    getSelectedCount() {
        return this.selectedSeats.length;
    }

    /**
     * Check if a seat can be selected
     */
    canSelectSeat(seatId) {
        const seat = this.findSeat(seatId);
        if (!seat) return false;
        if (this.getSelectedCount() >= SEAT_CONFIG.MAX_SEATS) return false;
        return seat.canSelect();
    }

    /**
     * Select a seat
     */
    selectSeat(seatId) {
        const seat = this.findSeat(seatId);
        if (!seat) return false;
        if (seat.select()) {
            this.updateCounts();
            return true;
        }
        return false;
    }

    /**
     * Deselect a seat
     */
    deselectSeat(seatId) {
        const seat = this.findSeat(seatId);
        if (!seat) return false;
        if (seat.deselect()) {
            this.updateCounts();
            return true;
        }
        return false;
    }

    /**
     * Clear all selected seats
     */
    clearSelection() {
        this.selectedSeats.forEach(seat => {
            seat.deselect();
        });
        this.updateCounts();
    }

    /**
     * Check if any seats are selected
     */
    hasSelection() {
        return this.getSelectedCount() > 0;
    }

    /**
     * Get seating layout as rows for display
     */
    getSeatLayout() {
        const rows = {};
        this.seats.forEach(seat => {
            if (!rows[seat.rowNumber]) {
                rows[seat.rowNumber] = [];
            }
            rows[seat.rowNumber].push(seat);
        });

        // Sort rows alphabetically
        const sortedRows = Object.keys(rows).sort();
        const layout = {};
        sortedRows.forEach(row => {
            layout[row] = rows[row].sort((a, b) => {
                return parseInt(a.seatNumber) - parseInt(b.seatNumber);
            });
        });

        return layout;
    }

    /**
     * Get seat summary for display
     */
    getSummary() {
        return {
            total: this.totalSeats,
            available: this.availableSeats,
            booked: this.bookedSeats,
            selected: this.getSelectedCount(),
            reserved: this.reservedSeats.length,
            totalPrice: this.getSelectedTotalPrice(),
            selectedSeats: this.getSelectedSeatNumbers()
        };
    }

    /**
     * Get discount applicable
     */
    getDiscount() {
        const selectedCount = this.getSelectedCount();
        if (selectedCount >= SEAT_CONFIG.BULK_DISCOUNT.threshold) {
            return {
                percentage: SEAT_CONFIG.BULK_DISCOUNT.discountPercent,
                amount: this.getSelectedTotalPrice() * (SEAT_CONFIG.BULK_DISCOUNT.discountPercent / 100)
            };
        }
        return { percentage: 0, amount: 0 };
    }

    /**
     * Get final total with discount
     */
    getFinalTotal() {
        const total = this.getSelectedTotalPrice();
        const discount = this.getDiscount();
        return {
            subtotal: total,
            discount: discount.amount,
            total: total - discount.amount,
            selectedCount: this.getSelectedCount(),
            discountPercent: discount.percentage
        };
    }

    /**
     * Convert to plain object
     */
    toJSON() {
        return {
            showId: this.showId,
            theatreName: this.theatreName,
            screenName: this.screenName,
            seats: this.seats.map(s => s.toJSON()),
            totalSeats: this.totalSeats,
            availableSeats: this.availableSeats,
            bookedSeats: this.bookedSeats,
            selectedSeats: this.selectedSeats.map(s => s.toJSON()),
            reservedSeats: this.reservedSeats.map(s => s.toJSON()),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create from API response
     */
    static fromAPI(data) {
        const seats = (data.seats || []).map(s => Seat.fromAPI(s));
        return new SeatMap({
            showId: data.showId,
            theatreName: data.theatreName || data.theatre?.name || '',
            screenName: data.screenName || data.screen?.name || '',
            seats: seats,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
    }
}

// ============================================================
// SEAT API SERVICE
// ============================================================

class SeatAPI {
    /**
     * Get seat map for a show
     * @param {number} showId - Show ID
     * @returns {Promise<SeatMap>}
     */
    static async getSeatMap(showId) {
        try {
            const response = await this.simulateAPICall(`/seats/${showId}`, 'GET');

            if (response.success) {
                const seatMap = SeatMap.fromAPI(response.data);
                console.log('🗺️ Seat map loaded:', seatMap.totalSeats, 'seats');
                return seatMap;
            } else {
                throw new Error(response.message || 'Failed to load seat map');
            }
        } catch (error) {
            console.error('❌ Failed to load seat map:', error);
            throw error;
        }
    }

    /**
     * Reserve seats temporarily
     * @param {number} showId - Show ID
     * @param {string[]} seatIds - Seat IDs to reserve
     * @returns {Promise<{success: boolean, seats: Seat[]}>}
     */
    static async reserveSeats(showId, seatIds) {
        try {
            const requestData = {
                showId,
                seatIds,
                reserveMinutes: SEAT_CONFIG.RESERVATION_MINUTES
            };

            const response = await this.simulateAPICall('/seats/reserve', 'POST', requestData);

            if (response.success) {
                const reservedSeats = response.data.seats.map(s => Seat.fromAPI(s));
                console.log('🔒 Seats reserved:', reservedSeats.length);
                return {
                    success: true,
                    seats: reservedSeats
                };
            } else {
                throw new Error(response.message || 'Failed to reserve seats');
            }
        } catch (error) {
            console.error('❌ Failed to reserve seats:', error);
            throw error;
        }
    }

    /**
     * Release reserved seats
     * @param {number} showId - Show ID
     * @param {string[]} seatIds - Seat IDs to release
     * @returns {Promise<{success: boolean}>}
     */
    static async releaseSeats(showId, seatIds) {
        try {
            const requestData = { showId, seatIds };

            const response = await this.simulateAPICall('/seats/release', 'POST', requestData);

            if (response.success) {
                console.log('🔓 Seats released:', seatIds.length);
                return { success: true };
            } else {
                throw new Error(response.message || 'Failed to release seats');
            }
        } catch (error) {
            console.error('❌ Failed to release seats:', error);
            throw error;
        }
    }

    /**
     * Simulate API call (replace with actual fetch calls)
     */
    static async simulateAPICall(endpoint, method, data = null) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 800));

        // Generate mock data
        if (endpoint.includes('/seats/') && method === 'GET') {
            const showId = parseInt(endpoint.split('/').pop());
            return {
                success: true,
                data: this.generateMockSeatMap(showId),
                message: 'Seat map loaded successfully'
            };
        }

        if (endpoint === '/seats/reserve' && method === 'POST') {
            const { seatIds } = data;
            return {
                success: true,
                data: {
                    seats: seatIds.map(id => ({
                        seatId: id,
                        isAvailable: false,
                        isReserved: true,
                        reservedUntil: new Date(Date.now() + SEAT_CONFIG.RESERVATION_MINUTES * 60000).toISOString()
                    }))
                },
                message: `Reserved ${seatIds.length} seats`
            };
        }

        if (endpoint === '/seats/release' && method === 'POST') {
            return {
                success: true,
                data: null,
                message: 'Seats released successfully'
            };
        }

        return {
            success: false,
            message: 'Unknown endpoint'
        };
    }

    /**
     * Generate mock seat map data
     */
    static generateMockSeatMap(showId) {
        const seats = [];
        const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        const cols = 16;

        let seatId = 1;
        rows.forEach((row, rowIndex) => {
            const isPrimeRow = rowIndex < 3;
            const isReclinerRow = rowIndex >= 7;
            const seatType = isReclinerRow ? 'Recliner' : (isPrimeRow ? 'Prime' : 'Classic');

            for (let col = 1; col <= cols; col++) {
                // Skip some seats for aisle effect
                if (col === 8 || col === 9) continue;

                const isAvailable = Math.random() > 0.3; // 70% available
                const isBestseller = rowIndex === 1 && (col >= 4 && col <= 6);
                const isReserved = false;

                seats.push({
                    seatId: seatId++,
                    showId: showId,
                    seatNumber: String(col).padStart(2, '0'),
                    rowNumber: row,
                    seatType: seatType,
                    seatPrice: SEAT_CONFIG.SEAT_TYPES[seatType]?.price || 200,
                    isAvailable: isAvailable,
                    isReserved: isReserved,
                    isBestseller: isBestseller,
                    positionX: col,
                    positionY: rowIndex + 1,
                    reservedUntil: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
        });

        return {
            showId: showId,
            theatreName: 'INOX: Reliance Mega Mall',
            screenName: 'Screen 1',
            seats: seats,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
}

// ============================================================
// SEAT SELECTION UI CONTROLLER
// ============================================================

class SeatSelectionUIController {
    constructor() {
        this.seatMap = null;
        this.showId = null;
        this.selectedSeats = [];
        this.countdownInterval = null;
        this.isProcessing = false;
    }

    /**
     * Initialize seat selection UI
     */
    async init() {
        // Get show ID from URL or data attribute
        this.showId = this.getShowId();

        if (this.showId) {
            await this.loadSeatMap(this.showId);
        }

        this.setupEventListeners();
        this.setupKeyboardShortcuts();

        console.log('💺 Seat Selection UI initialized');
    }

    /**
     * Get show ID from URL or data attribute
     */
    getShowId() {
        // Check URL params
        const params = new URLSearchParams(window.location.search);
        const showId = params.get('showId');

        if (showId) {
            return parseInt(showId);
        }

        // Check data attribute
        const container = document.getElementById('seatSelectionContainer');
        if (container && container.dataset.showId) {
            return parseInt(container.dataset.showId);
        }

        // Default for demo
        return 1;
    }

    /**
     * Load seat map
     */
    async loadSeatMap(showId) {
        try {
            this.showLoading('Loading seat map...');

            this.seatMap = await SeatAPI.getSeatMap(showId);

            if (!this.seatMap || this.seatMap.totalSeats === 0) {
                throw new Error('No seats found for this show');
            }

            this.renderSeatMap();
            this.renderSummary();
            this.updateSeatCountButtons();

            this.showNotification(
                'Seat Map Loaded',
                `${this.seatMap.availableSeats} seats available`,
                'success'
            );

        } catch (error) {
            console.error('Failed to load seat map:', error);
            this.showNotification('Error', error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Render seat map
     */
    renderSeatMap() {
        const container = document.getElementById('seatMapContainer');
        if (!container) return;

        if (!this.seatMap) {
            container.innerHTML = '<p class="text-center text-muted">No seats available</p>';
            return;
        }

        const layout = this.seatMap.getSeatLayout();
        const rows = Object.keys(layout).sort();

        let html = `
            <div class="seat-map-screen">
                <div class="screen">🎬 S C R E E N</div>
                <div class="screen-label">${this.seatMap.theatreName} · ${this.seatMap.screenName}</div>
            </div>
            <div class="seat-map-grid">
        `;

        rows.forEach(row => {
            const seats = layout[row];
            const firstSeat = seats[0];
            const seatType = firstSeat?.seatType || 'Classic';
            const typeDetails = SEAT_CONFIG.SEAT_TYPES[seatType] || SEAT_CONFIG.SEAT_TYPES['Classic'];

            html += `
                <div class="seat-row">
                    <span class="row-label">${row}</span>
                    <div class="seat-group">
            `;

            seats.forEach(seat => {
                const status = seat.getStatus();
                const isSelected = status === 'selected';
                const isAvailable = status === 'available';
                const isSold = status === 'sold';
                const isReserved = status === 'reserved';
                const isBestseller = status === 'bestseller';

                const classes = [
                    'seat',
                    `seat-${status}`,
                    isSelected ? 'selected' : '',
                    isBestseller ? 'bestseller' : '',
                    isSold ? 'sold' : '',
                    isReserved ? 'reserved' : ''
                ].filter(Boolean).join(' ');

                html += `
                    <div class="${classes}" 
                         data-seat-id="${seat.id}"
                         data-seat-number="${seat.seatNumber}"
                         data-row="${seat.rowNumber}"
                         data-price="${seat.seatPrice}"
                         data-type="${seat.seatType}"
                         onclick="window.seatUI.toggleSeat(${seat.id})"
                         title="${seat.getDisplayName()} - ${seat.getStatusLabel()} (₹${seat.seatPrice})">
                        <span class="seat-number">${seat.seatNumber}</span>
                        ${isBestseller ? '<span class="bestseller-star">⭐</span>' : ''}
                    </div>
                `;
            });

            html += `
                        <span class="row-price">${typeDetails.label} ₹${typeDetails.price}</span>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            <div class="seat-legend">
                <span class="legend-item">
                    <span class="legend-box available"></span> Available
                </span>
                <span class="legend-item">
                    <span class="legend-box sold"></span> Sold
                </span>
                <span class="legend-item">
                    <span class="legend-box reserved"></span> Reserved
                </span>
                <span class="legend-item">
                    <span class="legend-box selected"></span> Selected
                </span>
                <span class="legend-item">
                    <span class="legend-box bestseller"></span> Bestseller
                </span>
            </div>
        `;

        container.innerHTML = html;
        this.attachSeatEvents();
    }

    /**
     * Attach seat click events
     */
    attachSeatEvents() {
        document.querySelectorAll('.seat.available, .seat.bestseller').forEach(el => {
            el.addEventListener('click', (e) => {
                const seatId = parseInt(el.dataset.seatId);
                this.toggleSeat(seatId);
            });
        });
    }

    /**
     * Toggle seat selection
     */
    toggleSeat(seatId) {
        if (this.isProcessing) return;

        const seat = this.seatMap.findSeat(seatId);
        if (!seat) return;

        if (seat.isSelected) {
            // Deselect
            this.seatMap.deselectSeat(seatId);
            this.updateSeatDisplay(seatId, 'available');
            this.updateSummary();
            this.showNotification('Seat Deselected', `Seat ${seat.getDisplayName()} deselected`, 'info');
        } else {
            // Select
            if (this.seatMap.getSelectedCount() >= SEAT_CONFIG.MAX_SEATS) {
                this.showNotification('Max Seats Reached', `Maximum ${SEAT_CONFIG.MAX_SEATS} seats allowed`, 'warning');
                return;
            }

            if (!seat.canSelect()) {
                this.showNotification('Not Available', `Seat ${seat.getDisplayName()} is not available`, 'error');
                return;
            }

            this.seatMap.selectSeat(seatId);
            this.updateSeatDisplay(seatId, 'selected');
            this.updateSummary();
            this.showNotification('Seat Selected', `Seat ${seat.getDisplayName()} selected`, 'success');
        }

        // Update count
        this.updateSeatCountButtons();
    }

    /**
     * Update seat display visually
     */
    updateSeatDisplay(seatId, status) {
        const seatElement = document.querySelector(`.seat[data-seat-id="${seatId}"]`);
        if (!seatElement) return;

        // Remove all status classes
        seatElement.classList.remove('available', 'selected', 'sold', 'reserved', 'bestseller');
        seatElement.classList.add(status);

        // Update title
        const seat = this.seatMap.findSeat(seatId);
        if (seat) {
            seatElement.title = `${seat.getDisplayName()} - ${seat.getStatusLabel()} (₹${seat.seatPrice})`;
        }
    }

    /**
     * Update summary
     */
    renderSummary() {
        this.updateSummary();
    }

    /**
     * Update summary data
     */
    updateSummary() {
        const summary = this.seatMap.getSummary();
        const finalTotal = this.seatMap.getFinalTotal();

        // Update selected seats display
        const selectedSeatsEl = document.getElementById('selectedSeatsDisplay');
        if (selectedSeatsEl) {
            if (summary.selected === 0) {
                selectedSeatsEl.textContent = 'No seats selected';
            } else {
                selectedSeatsEl.textContent = summary.selectedSeats.join(', ');
            }
        }

        // Update counts
        const countEl = document.getElementById('seatCount');
        if (countEl) {
            countEl.textContent = `${summary.selected}/${SEAT_CONFIG.MAX_SEATS}`;
        }

        // Update prices
        const subtotalEl = document.getElementById('subtotalDisplay');
        const discountEl = document.getElementById('discountDisplay');
        const totalEl = document.getElementById('totalDisplay');

        if (subtotalEl) subtotalEl.textContent = `₹${finalTotal.subtotal}`;
        if (discountEl) {
            if (finalTotal.discount > 0) {
                discountEl.textContent = `-₹${finalTotal.discount.toFixed(0)} (${finalTotal.discountPercent}% off)`;
                discountEl.style.display = 'block';
            } else {
                discountEl.textContent = 'No discount';
                discountEl.style.display = 'block';
            }
        }
        if (totalEl) totalEl.textContent = `₹${finalTotal.total}`;

        // Update proceed button
        const proceedBtn = document.getElementById('proceedToPaymentBtn');
        if (proceedBtn) {
            if (summary.selected > 0) {
                proceedBtn.disabled = false;
                proceedBtn.textContent = `🎫 Proceed to Payment (₹${finalTotal.total})`;
            } else {
                proceedBtn.disabled = true;
                proceedBtn.textContent = '🎫 Select Seats First';
            }
        }

        // Update booking summary in sidebar
        this.updateBookingSidebar(finalTotal);
    }

    /**
     * Update booking sidebar
     */
    updateBookingSidebar(finalTotal) {
        const sidebar = document.getElementById('bookingSummarySidebar');
        if (!sidebar) return;

        const selectedSeats = this.seatMap.getSelectedSeatNumbers();
        const selectedCount = this.seatMap.getSelectedCount();

        sidebar.innerHTML = `
            <div class="summary-item">
                <span class="label">Selected Seats</span>
                <span class="value">${selectedCount > 0 ? selectedSeats.join(', ') : 'None'}</span>
            </div>
            <div class="summary-item">
                <span class="label">Tickets</span>
                <span class="value">${selectedCount}</span>
            </div>
            <div class="summary-item">
                <span class="label">Subtotal</span>
                <span class="value">₹${finalTotal.subtotal}</span>
            </div>
            ${finalTotal.discount > 0 ? `
                <div class="summary-item">
                    <span class="label">Discount (${finalTotal.discountPercent}%)</span>
                    <span class="value" style="color: #00b894;">-₹${finalTotal.discount.toFixed(0)}</span>
                </div>
            ` : ''}
            <div class="summary-item total">
                <span class="label">Total</span>
                <span class="value" style="color: #ff6b6b; font-size: 20px; font-weight: 700;">₹${finalTotal.total}</span>
            </div>
            <button class="btn btn-primary btn-block" 
                    onclick="window.seatUI.proceedToBooking()"
                    ${selectedCount === 0 ? 'disabled' : ''}>
                🎫 Book Now
            </button>
        `;
    }

    /**
     * Update seat count buttons
     */
    updateSeatCountButtons() {
        const buttons = document.querySelectorAll('.seat-count-btn');
        const selectedCount = this.seatMap.getSelectedCount();

        buttons.forEach((btn, index) => {
            const count = index + 1;
            const isActive = selectedCount === count;
            btn.classList.toggle('active', isActive);
            btn.style.background = isActive ? '#ff6b6b' : 'white';
            btn.style.color = isActive ? 'white' : '#333';
            btn.style.borderColor = isActive ? '#ff6b6b' : '#e0e0e0';
        });
    }

    /**
     * Proceed to booking
     */
    proceedToBooking() {
        if (this.isProcessing) return;
        if (this.seatMap.getSelectedCount() === 0) {
            this.showNotification('No Seats Selected', 'Please select at least one seat', 'warning');
            return;
        }

        this.isProcessing = true;

        // Reserve seats
        const selectedIds = this.seatMap.getSelectedSeatIds();
        SeatAPI.reserveSeats(this.showId, selectedIds)
            .then((result) => {
                if (result.success) {
                    // Save selection to localStorage
                    const bookingData = {
                        showId: this.showId,
                        selectedSeats: this.seatMap.getSelectedSeatNumbers(),
                        selectedSeatIds: selectedIds,
                        totalAmount: this.seatMap.getFinalTotal().total,
                        totalTickets: this.seatMap.getSelectedCount(),
                        timestamp: new Date().toISOString()
                    };
                    localStorage.setItem('pendingBooking', JSON.stringify(bookingData));

                    // Navigate to booking confirmation
                    window.location.href = 'booking-confirmation.html';
                } else {
                    this.showNotification('Reservation Failed', 'Could not reserve seats. Please try again.', 'error');
                    this.isProcessing = false;
                }
            })
            .catch((error) => {
                this.showNotification('Error', error.message, 'error');
                this.isProcessing = false;
            });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Seat count buttons
        document.querySelectorAll('.seat-count-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const count = parseInt(e.target.dataset.count);
                this.selectSeatCount(count);
            });
        });

        // Proceed button
        const proceedBtn = document.getElementById('proceedToPaymentBtn');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => this.proceedToBooking());
        }

        // Clear selection
        const clearBtn = document.getElementById('clearSelectionBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSelection());
        }

        // Search seats
        const searchInput = document.getElementById('seatSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchSeats(e.target.value));
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+A - Select all available seats (max 10)
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                this.selectAllSeats();
            }

            // Ctrl+D - Deselect all
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.clearSelection();
            }

            // Escape - Clear selection
            if (e.key === 'Escape') {
                this.clearSelection();
            }
        });
    }

    /**
     * Select seat count
     */
    selectSeatCount(count) {
        if (count > SEAT_CONFIG.MAX_SEATS) {
            this.showNotification('Max Seats', `Maximum ${SEAT_CONFIG.MAX_SEATS} seats allowed`, 'warning');
            return;
        }

        // Clear current selection
        this.clearSelection();

        // Select first available seats
        let selected = 0;
        for (const seat of this.seatMap.seats) {
            if (selected >= count) break;
            if (seat.canSelect()) {
                this.seatMap.selectSeat(seat.id);
                this.updateSeatDisplay(seat.id, 'selected');
                selected++;
            }
        }

        if (selected < count) {
            this.showNotification('Not Enough Seats', `Only ${selected} seats available`, 'warning');
        }

        this.updateSummary();
        this.updateSeatCountButtons();
    }

    /**
     * Select all available seats (up to max)
     */
    selectAllSeats() {
        this.clearSelection();
        let selected = 0;
        for (const seat of this.seatMap.seats) {
            if (selected >= SEAT_CONFIG.MAX_SEATS) break;
            if (seat.canSelect()) {
                this.seatMap.selectSeat(seat.id);
                this.updateSeatDisplay(seat.id, 'selected');
                selected++;
            }
        }
        this.updateSummary();
        this.updateSeatCountButtons();
        this.showNotification('Seats Selected', `Selected ${selected} seats`, 'success');
    }

    /**
     * Clear all selection
     */
    clearSelection() {
        const selectedIds = this.seatMap.getSelectedSeatIds();
        selectedIds.forEach(id => {
            this.seatMap.deselectSeat(id);
            this.updateSeatDisplay(id, 'available');
        });
        this.updateSummary();
        this.updateSeatCountButtons();
        this.showNotification('Selection Cleared', 'All seats deselected', 'info');
    }

    /**
     * Search seats
     */
    searchSeats(query) {
        if (!query.trim()) {
            // Show all seats
            document.querySelectorAll('.seat').forEach(el => {
                el.style.display = '';
            });
            return;
        }

        const searchLower = query.toLowerCase();
        document.querySelectorAll('.seat').forEach(el => {
            const seatId = el.dataset.seatId;
            const seat = this.seatMap.findSeat(parseInt(seatId));
            if (seat) {
                const displayName = seat.getDisplayName().toLowerCase();
                const match = displayName.includes(searchLower);
                el.style.display = match ? '' : 'none';
            }
        });
    }

    /**
     * Show notification
     */
    showNotification(title, message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) {
            console.log(`📢 ${title}: ${message}`);
            return;
        }

        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-icon">${icons[type] || 'ℹ️'}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    /**
     * Show loading state
     */
    showLoading(message) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            const msgEl = overlay.querySelector('.loading-message');
            if (msgEl) msgEl.textContent = message;
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
const seatUI = new SeatSelectionUIController();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    seatUI.init();
    console.log('💺 Seat Selection module loaded successfully');
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Seat,
        SeatMap,
        SeatAPI,
        SeatSelectionUIController,
        SEAT_CONFIG
    };
}