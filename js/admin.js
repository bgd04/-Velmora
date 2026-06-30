/* config */

const RESTAURANT_CAPACITY = 40;



/* constante login */

const adminLoginSection = document.getElementById("adminLoginSection");
const adminPanel = document.getElementById("adminPanel");
const adminLoginForm = document.getElementById("adminLoginForm");
const loginError = document.getElementById("loginError");
const logoutAdmin = document.getElementById("logoutAdmin");



/* constarnte stats admin */

const todayReservationsCount = document.getElementById("todayReservationsCount");
const pendingReservationsCount = document.getElementById("pendingReservationsCount");
const eveningSeatsCount = document.getElementById("eveningSeatsCount");



/* constante rezervari */

const reservationsTable = document.getElementById("reservationsTable");
const clearReservations = document.getElementById("clearReservations");
const reservationSearchInput = document.getElementById("reservationSearchInput");
const reservationStatusFilter = document.getElementById("reservationStatusFilter");
const reservationDateFilter = document.getElementById("reservationDateFilter");



/* constante calendar admin */

const adminDateDropdown = document.getElementById("adminDateDropdown");
const adminDateDropdownToggle = document.getElementById("adminDateDropdownToggle");
const adminDateDropdownMenu = document.getElementById("adminDateDropdownMenu");
const adminCurrentMonthLabel = document.getElementById("adminCurrentMonthLabel");
const adminDateCalendarDays = document.getElementById("adminDateCalendarDays");
const adminPrevMonth = document.getElementById("adminPrevMonth");
const adminNextMonth = document.getElementById("adminNextMonth");
const adminClearDate = document.getElementById("adminClearDate");
const adminTodayDate = document.getElementById("adminTodayDate");



/* constante meniu admin */

const menuItemForm = document.getElementById("menuItemForm");
const menuItemsTable = document.getElementById("menuItemsTable");
const menuSubmitButton = document.getElementById("menuSubmitButton");
const cancelMenuEdit = document.getElementById("cancelMenuEdit");
const menuSearchInput = document.getElementById("menuSearchInput");
const menuCategoryFilter = document.getElementById("menuCategoryFilter");
const menuFeedback = document.getElementById("menuFeedback");



/* constante actiuni */

const deleteModal = document.getElementById("deleteModal");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");
const deleteMenuModal = document.getElementById("deleteMenuModal");
const cancelMenuDelete = document.getElementById("cancelMenuDelete");
const confirmMenuDelete = document.getElementById("confirmMenuDelete");
const deleteReservationsModal = document.getElementById("deleteReservationsModal");
const cancelDeleteReservations = document.getElementById("cancelDeleteReservations");
const confirmDeleteReservations = document.getElementById("confirmDeleteReservations");
const deleteReservationsMessage = document.getElementById("deleteReservationsMessage");



/* variabile */

let reservationsCache = [];
let menuItemsCache = [];

let adminCalendarDate = new Date();

let reservationToDelete = null;
let reservationsPendingDelete = [];

let menuItemToDelete = null;
let menuItemToEdit = null;



/* config status */

const statusLabels = {
    pending: "În așteptare",
    confirmed: "Confirmată",
    cancelled: "Anulată"
};



/* feedback menu */

function showMenuFeedback(message) {
    if (!menuFeedback) {
        return;
    }

    menuFeedback.textContent = message;
    menuFeedback.classList.remove("hidden");

    setTimeout(() => {
        menuFeedback.classList.add("hidden");
    }, 3000);
}



/* login si permisiuni admin */

function getAdminRole() {
    return localStorage.getItem("velmora_admin_role");
}

function applyRolePermissions() {
    const menuAdminSection =
        document.getElementById("menuAdminSection");

    if (!menuAdminSection) {
        return;
    }

    if (getAdminRole() === "manager") {
        menuAdminSection.classList.add("hidden");
    } else {
        menuAdminSection.classList.remove("hidden");
    }
}

function isAdminLoggedIn() {
    return localStorage.getItem("velmora_admin_logged") === "true";
}

function showAdminPanel() {
    adminLoginSection.classList.add("hidden");
    adminPanel.classList.remove("hidden");

    applyRolePermissions();

    displayReservations();
    displayMenuItems();
}

function showLoginForm() {
    adminLoginSection.classList.remove("hidden");
    adminPanel.classList.add("hidden");
}

if (isAdminLoggedIn()) {
    showAdminPanel();
} else {
    showLoginForm();
}

if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const formData = new FormData(adminLoginForm);

        const loginData = {
            username: formData.get("username"),
            password: formData.get("password")
        };

        try {
            const response = await fetch("/api/admin/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(loginData)
            });

            const data = await response.json();

            if (!response.ok) {
                loginError.textContent =
                    data.message || "Autentificare eșuată.";
                return;
            }

            localStorage.setItem("velmora_admin_logged", "true");
            localStorage.setItem("velmora_admin_username", data.admin.username);
            localStorage.setItem("velmora_admin_role", data.admin.role);

            loginError.textContent = "";
            adminLoginForm.reset();

            showAdminPanel();

        } catch (error) {
            console.error(error);
            loginError.textContent = "Serverul nu răspunde.";
        }
    });
}

if (logoutAdmin) {
    logoutAdmin.addEventListener("click", function() {
        localStorage.removeItem("velmora_admin_logged");
        localStorage.removeItem("velmora_admin_username");
        localStorage.removeItem("velmora_admin_role");

        showLoginForm();
    });
}



/* functii de ajutor */

function formatDate(value) {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("ro-RO");
}

function formatDateForCompare(dateString) {
    const date = new Date(dateString);

    const year = date.getFullYear();
    const month =
        String(date.getMonth() + 1).padStart(2, "0");
    const day =
        String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDateTime(value) {
    if (!value) return "-";

    return new Date(value).toLocaleString("ro-RO");
}

function getGuestsNumber(guests) {
    return parseInt(guests, 10) || 0;
}

function timeToMinutes(time) {
    const [hour, minute] = time.split(":").map(Number);

    return hour * 60 + minute;
}



/* capacitate rezervari */

function calculateOccupiedSeats(reservation) {
    const reservationDate =
        reservation.reservation_date;

    const reservationHour =
        reservation.reservation_time;

    const [hour, minute] =
        reservationHour.split(":").map(Number);

    const reservationMinutes =
        hour * 60 + minute;

    let intervalStart;
    let intervalEnd;

    if (reservationMinutes >= 20 * 60) {
        intervalStart = 20 * 60;
        intervalEnd = 24 * 60;
    } else {
        intervalStart = reservationMinutes;
        intervalEnd = reservationMinutes + 120;
    }

    let occupiedSeats = 0;

    reservationsCache.forEach(item => {
        if (item.status !== "confirmed") {
            return;
        }

        if (item.reservation_date !== reservationDate) {
            return;
        }

        const [itemHour, itemMinute] =
            item.reservation_time
                .split(":")
                .map(Number);

        const itemMinutes =
            itemHour * 60 + itemMinute;

        if (
            itemMinutes >= intervalStart &&
            itemMinutes <= intervalEnd
        ) {
            occupiedSeats +=
                getGuestsNumber(item.guests);
        }
    });

    return occupiedSeats;
}



/* rezervari */

async function displayReservations() {
    if (!isAdminLoggedIn()) {
        return;
    }

    try {
        const response = await fetch("/api/reservations");
        const reservations = await response.json();

        reservationsCache = Array.isArray(reservations)
            ? reservations
            : [];

        updateReservationStatusFilter();
        updateAdminStats();

        renderReservations();

    } catch (error) {
        console.error(error);

        reservationsTable.innerHTML = `
            <p class="empty-message">
                Eroare la încărcarea rezervărilor.
            </p>
        `;
    }
}

function getFilteredReservations() {
    let reservations = [...reservationsCache];

    const searchValue = reservationSearchInput
        ? reservationSearchInput.value.toLowerCase().trim()
        : "";

    const selectedStatus = reservationStatusFilter
        ? reservationStatusFilter.value
        : "all";

    const selectedDate = reservationDateFilter
        ? reservationDateFilter.value
        : "";

    if (selectedStatus !== "all") {
        reservations = reservations.filter(reservation =>
            reservation.status === selectedStatus
        );
    }

    if (selectedDate) {
        reservations = reservations.filter(reservation =>
            formatDateForCompare(reservation.reservation_date) === selectedDate
        );
    }

    if (searchValue) {
        reservations = reservations.filter(reservation =>
            reservation.name.toLowerCase().includes(searchValue) ||
            reservation.email.toLowerCase().includes(searchValue) ||
            reservation.phone.toLowerCase().includes(searchValue) ||
            (statusLabels[reservation.status] || reservation.status)
                .toLowerCase()
                .includes(searchValue)
        );
    }

    return reservations;
}

function renderReservations() {
    updateReservationStatusFilter();

    let reservations = getFilteredReservations();

    if (!Array.isArray(reservations) || reservations.length === 0) {
        reservationsTable.innerHTML = `
            <p class="empty-message">
                Nu există rezervări pentru filtrul selectat.
            </p>
        `;
        return;
    }

    let html = `
        <div class="reservation-cards">
    `;

    reservations.forEach(reservation => {
        const occupiedSeats =
            calculateOccupiedSeats(reservation);

        const seatsAfterConfirmation =
            reservation.status === "pending"
                ? occupiedSeats + getGuestsNumber(reservation.guests)
                : occupiedSeats;

        const exceedsCapacity =
            reservation.status === "pending" &&
            seatsAfterConfirmation > RESTAURANT_CAPACITY;

        let actionButtons = `
            <div class="reservation-status-actions">
        `;

        if (reservation.status === "pending") {
            actionButtons += `
                <button
                    class="status-btn status-btn-confirm"
                    onclick="updateReservationStatus(${reservation.id}, 'confirmed')">
                    Confirmă
                </button>

                <button
                    class="status-btn status-btn-cancel"
                    onclick="updateReservationStatus(${reservation.id}, 'cancelled')">
                    Anulează
                </button>
            `;
        }

        actionButtons += `
            </div>
        `;

        html += `
            <div class="reservation-card">

                <div class="reservation-card-header">
                    <div>
                        <h3>${reservation.name}</h3>
                        <p>${reservation.email}</p>
                    </div>

                    <span class="status-badge status-${reservation.status}">
                        ${statusLabels[reservation.status] || reservation.status}
                    </span>
                </div>

                <div class="reservation-card-details">
                    <div>
                        <span>Telefon</span>
                        <strong>${reservation.phone}</strong>
                    </div>

                    <div>
                        <span>Data</span>
                        <strong>${formatDate(reservation.reservation_date)}</strong>
                    </div>

                    <div>
                        <span>Ora</span>
                        <strong>${reservation.reservation_time}</strong>
                    </div>

                    <div>
                        <span>Persoane</span>
                        <strong>${reservation.guests}</strong>
                    </div>
                </div>

                <div class="reservation-card-message">
                    <span>Cereri speciale</span>
                    <p>${reservation.message || "Nu există cereri speciale."}</p>
                </div>

                <div class="reservation-capacity">
                    <span>
                        Locuri confirmate:
                        ${occupiedSeats}/${RESTAURANT_CAPACITY}
                    </span>

                    ${
                        exceedsCapacity
                            ? `
                                <span class="capacity-warning">
                                    ⚠ După confirmare:
                                    ${seatsAfterConfirmation}/${RESTAURANT_CAPACITY}
                                </span>
                            `
                            : ""
                    }
                </div>

                <div class="reservation-card-footer">
                    <small>
                        Primită la: ${formatDateTime(reservation.created_at)}
                    </small>

                    ${actionButtons}

                    <button
                        class="delete-btn reservation-delete-action"
                        onclick="deleteReservation(${reservation.id})">
                        Șterge
                    </button>
                </div>

            </div>
        `;
    });

    html += `
        </div>
    `;

    reservationsTable.innerHTML = html;
}



/* statistici si filtre rezervari */

function updateReservationStatusFilter() {
    if (!reservationStatusFilter) {
        return;
    }

    const currentValue =
        reservationStatusFilter.value || "all";

    const selectedDate = reservationDateFilter
        ? reservationDateFilter.value
        : "";

    let reservationsForCounts = [...reservationsCache];

    if (selectedDate) {
        reservationsForCounts = reservationsForCounts.filter(reservation => {
            const reservationDate =
                new Date(reservation.reservation_date)
                    .toISOString()
                    .split("T")[0];

            return reservationDate === selectedDate;
        });
    }

    const statusCounts = {
        pending: 0,
        confirmed: 0,
        cancelled: 0
    };

    reservationsForCounts.forEach(reservation => {
        if (statusCounts[reservation.status] !== undefined) {
            statusCounts[reservation.status]++;
        }
    });

    reservationStatusFilter.innerHTML = `
        <option value="all">
            Toate rezervările (${reservationsForCounts.length})
        </option>

        <option value="pending">
            În așteptare (${statusCounts.pending})
        </option>

        <option value="confirmed">
            Confirmate (${statusCounts.confirmed})
        </option>

        <option value="cancelled">
            Anulate (${statusCounts.cancelled})
        </option>
    `;

    reservationStatusFilter.value = currentValue;
}

function updateAdminStats() {
    if (
        !todayReservationsCount ||
        !pendingReservationsCount ||
        !eveningSeatsCount
    ) {
        return;
    }

    const today =
        new Date().toISOString().split("T")[0];

    const todayReservations =
        reservationsCache.filter(reservation =>
            formatDateForCompare(reservation.reservation_date) === today &&
            reservation.status === "confirmed"
        );

    const pendingReservations =
        reservationsCache.filter(reservation =>
            reservation.status === "pending"
        );

    const eveningReservations =
        reservationsCache.filter(reservation => {
            const reservationDate =
                formatDateForCompare(reservation.reservation_date);

            if (reservationDate !== today) {
                return false;
            }

            if (reservation.status !== "confirmed") {
                return false;
            }

            const reservationMinutes =
                timeToMinutes(reservation.reservation_time);

            return reservationMinutes >= 20 * 60;
        });

    const eveningSeats =
        eveningReservations.reduce((total, reservation) => {
            return total + getGuestsNumber(reservation.guests);
        }, 0);

    todayReservationsCount.textContent =
        todayReservations.length;

    pendingReservationsCount.textContent =
        pendingReservations.length;

    eveningSeatsCount.textContent =
        `${eveningSeats}/${RESTAURANT_CAPACITY}`;
}



/* event filtre rezervari */

if (reservationSearchInput) {
    reservationSearchInput.addEventListener(
        "input",
        renderReservations
    );
}

if (reservationStatusFilter) {
    reservationStatusFilter.addEventListener(
        "change",
        renderReservations
    );
}

if (reservationDateFilter) {
    reservationDateFilter.addEventListener(
        "change",
        renderReservations
    );
}



/* actualizare status rezervari */

async function updateReservationStatus(id, status) {
    try {
        const response = await fetch(
            `/api/reservations/${id}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    status
                })
            }
        );

        if (!response.ok) {
            throw new Error();
        }

        displayReservations();

    } catch (error) {
        console.error(error);
        alert("Nu s-a putut actualiza statusul.");
    }
}



/* stergere rezervari dupa filtre */

if (clearReservations) {
    clearReservations.addEventListener("click", function() {
        const reservationsToDelete = getFilteredReservations();

        if (reservationsToDelete.length === 0) {
            deleteReservationsMessage.textContent =
                "Nu există rezervări de șters pentru filtrele selectate.";

            confirmDeleteReservations.style.display = "none";
            deleteReservationsModal.classList.remove("hidden");

            return;
        }

        reservationsPendingDelete = reservationsToDelete;

        deleteReservationsMessage.textContent =
            `Sigur dorești să ștergi ${reservationsToDelete.length} rezervări afișate? Această acțiune nu poate fi anulată.`;

        deleteReservationsModal.classList.remove("hidden");
    });
}

if (cancelDeleteReservations) {
    cancelDeleteReservations.addEventListener("click", function() {
        reservationsPendingDelete = [];

        confirmDeleteReservations.style.display = "";
        deleteReservationsModal.classList.add("hidden");
    });
}

if (confirmDeleteReservations) {
    confirmDeleteReservations.addEventListener("click", async function() {
        try {
            await Promise.all(
                reservationsPendingDelete.map(reservation =>
                    fetch(`/api/reservations/${reservation.id}`, {
                        method: "DELETE"
                    })
                )
            );

            reservationsPendingDelete = [];
            deleteReservationsModal.classList.add("hidden");

            displayReservations();

        } catch (error) {
            console.error(error);
            alert("Nu s-au putut șterge rezervările.");
        }
    });
}



/* stergere individuala rezervari */

function deleteReservation(id) {
    reservationToDelete = id;
    deleteModal.classList.remove("hidden");
}

if (cancelDelete) {
    cancelDelete.addEventListener("click", function() {
        reservationToDelete = null;
        deleteModal.classList.add("hidden");
    });
}

if (confirmDelete) {
    confirmDelete.addEventListener("click", async function() {
        if (!reservationToDelete) {
            return;
        }

        try {
            const response = await fetch(
                `/api/reservations/${reservationToDelete}`,
                {
                    method: "DELETE"
                }
            );

            if (!response.ok) {
                throw new Error();
            }

            reservationToDelete = null;
            deleteModal.classList.add("hidden");

            displayReservations();

        } catch (error) {
            console.error(error);
            alert("Nu s-a putut șterge rezervarea.");
        }
    });
}



/* meniu */

async function displayMenuItems() {
    try {
        const response = await fetch("/api/menu");
        const items = await response.json();

        menuItemsCache = Array.isArray(items)
            ? items
            : [];

        updateMenuCategoryFilter();
        renderMenuItems();

    } catch (error) {
        console.error(error);

        menuItemsTable.innerHTML = `
            <p class="empty-message">
                Eroare la încărcarea meniului.
            </p>
        `;
    }
}

function renderMenuItems() {
    let items = [...menuItemsCache];

    const searchValue = menuSearchInput
        ? menuSearchInput.value.toLowerCase().trim()
        : "";

    const selectedCategory = menuCategoryFilter
        ? menuCategoryFilter.value
        : "all";

    if (selectedCategory !== "all") {
        items = items.filter(item =>
            item.category === selectedCategory
        );
    }

    if (searchValue) {
        items = items.filter(item =>
            item.name.toLowerCase().includes(searchValue) ||
            item.description.toLowerCase().includes(searchValue) ||
            item.category.toLowerCase().includes(searchValue)
        );
    }

    if (!Array.isArray(items) || items.length === 0) {
        menuItemsTable.innerHTML = `
            <p class="empty-message">
                Nu există preparate pentru filtrul selectat.
            </p>
        `;

        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Categorie</th>
                    <th>Nume</th>
                    <th>Descriere</th>
                    <th>Preț</th>
                    <th>Acțiuni</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach(item => {
        const safeCategory =
            String(item.category).replace(/'/g, "\\'");

        const safeName =
            String(item.name).replace(/'/g, "\\'");

        const safeDescription =
            String(item.description).replace(/'/g, "\\'");

        const safePrice =
            String(item.price).replace(/'/g, "\\'");

        html += `
            <tr>
                <td>${item.category}</td>
                <td>${item.name}</td>
                <td>${item.description}</td>
                <td>${Number(item.price).toFixed(2)} Lei</td>

                <td>
                    <button
                        class="status-btn status-btn-confirm"
                        onclick="editMenuItem(${item.id}, '${safeCategory}', '${safeName}', '${safeDescription}', '${safePrice}')">
                        Editează
                    </button>

                    <button
                        class="delete-btn"
                        onclick="deleteMenuItem(${item.id})">
                        Șterge
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    menuItemsTable.innerHTML = html;
}



/* meniu filtre pe categorii */

function updateMenuCategoryFilter() {
    if (!menuCategoryFilter) {
        return;
    }

    const currentValue =
        menuCategoryFilter.value || "all";

    const categoryCounts = {};

    menuItemsCache.forEach(item => {
        categoryCounts[item.category] =
            (categoryCounts[item.category] || 0) + 1;
    });

    const orderedCategories = [
        "Startere",
        "Fel principal",
        "Desert",
        "Vinuri"
    ];

    const extraCategories =
        Object.keys(categoryCounts)
            .filter(category => !orderedCategories.includes(category))
            .sort();

    const allCategories = [
        ...orderedCategories.filter(category => categoryCounts[category]),
        ...extraCategories
    ];

    let html = `
        <option value="all">
            Toate categoriile (${menuItemsCache.length})
        </option>
    `;

    allCategories.forEach(category => {
        html += `
            <option value="${category}">
                ${category} (${categoryCounts[category]})
            </option>
        `;
    });

    menuCategoryFilter.innerHTML = html;
    menuCategoryFilter.value = currentValue;
}



/* event filtre meniu */

if (menuSearchInput) {
    menuSearchInput.addEventListener(
        "input",
        renderMenuItems
    );
}

if (menuCategoryFilter) {
    menuCategoryFilter.addEventListener(
        "change",
        renderMenuItems
    );
}



/* adaugare si ediare preparat meniu */

if (menuItemForm) {
    menuItemForm.addEventListener(
        "submit",
        async function(event) {
            event.preventDefault();

            const formData =
                new FormData(menuItemForm);

            const itemData = {
                category:
                    formData.get("category"),

                name:
                    formData.get("name"),

                description:
                    formData.get("description"),

                price:
                    formData.get("price")
            };

            try {
                const url = menuItemToEdit
                    ? `/api/menu/${menuItemToEdit}`
                    : "/api/menu";

                const method = menuItemToEdit
                    ? "PUT"
                    : "POST";

                const response =
                    await fetch(url, {
                        method,

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(itemData)
                    });

                if (!response.ok) {
                    throw new Error();
                }

                menuItemForm.reset();

                menuItemToEdit = null;

                menuSubmitButton.textContent =
                    "Adaugă preparat";

                cancelMenuEdit.classList.add(
                    "hidden"
                );

                displayMenuItems();

                showMenuFeedback(
                    method === "PUT"
                        ? "Preparatul a fost actualizat"
                        : "Preparatul a fost adăugat"
                );

            } catch (error) {
                console.error(error);

                alert(
                    "Nu s-a putut salva preparatul."
                );
            }
        }
    );
}



function editMenuItem(id, category, name, description, price) {
    menuItemToEdit = id;

    menuItemForm.category.value = category;
    menuItemForm.name.value = name;
    menuItemForm.description.value = description;
    menuItemForm.price.value = price;

    menuSubmitButton.textContent = "Actualizează preparat";

    cancelMenuEdit.classList.remove("hidden");

    menuItemForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

if (cancelMenuEdit) {
    cancelMenuEdit.addEventListener("click", function() {
        menuItemToEdit = null;

        menuItemForm.reset();

        menuSubmitButton.textContent = "Adaugă preparat";

        cancelMenuEdit.classList.add("hidden");
    });
}



/* stergere preparat meniu */

function deleteMenuItem(id) {
    menuItemToDelete = id;
    deleteMenuModal.classList.remove("hidden");
}

if (cancelMenuDelete) {
    cancelMenuDelete.addEventListener("click", function() {
        menuItemToDelete = null;
        deleteMenuModal.classList.add("hidden");
    });
}

if (confirmMenuDelete) {
    confirmMenuDelete.addEventListener("click", async function() {
        if (!menuItemToDelete) {
            return;
        }

        try {
            const response = await fetch(
                `/api/menu/${menuItemToDelete}`,
                {
                    method: "DELETE"
                }
            );

            if (!response.ok) {
                throw new Error();
            }

            menuItemToDelete = null;
            deleteMenuModal.classList.add("hidden");

            displayMenuItems();

        } catch (error) {
            console.error(error);
            alert("Nu s-a putut șterge preparatul.");
        }
    });
}



/* calendar admin - functii de ajutor */

function formatAdminDateForInput(date) {
    const year = date.getFullYear();
    const month =
        String(date.getMonth() + 1).padStart(2, "0");
    const day =
        String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatAdminDateForDisplay(date) {
    return date.toLocaleDateString("ro-RO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

const adminMonthNames = [
    "Ianuarie",
    "Februarie",
    "Martie",
    "Aprilie",
    "Mai",
    "Iunie",
    "Iulie",
    "August",
    "Septembrie",
    "Octombrie",
    "Noiembrie",
    "Decembrie"
];



/* selectare data calendar admin */

function renderAdminCalendar() {
    if (!adminDateCalendarDays || !adminCurrentMonthLabel) {
        return;
    }

    const year = adminCalendarDate.getFullYear();
    const month = adminCalendarDate.getMonth();

    adminCurrentMonthLabel.textContent =
        `${adminMonthNames[month]} ${year}`;

    adminDateCalendarDays.innerHTML = "";

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDay = firstDay.getDay();

    if (startDay === 0) {
        startDay = 7;
    }

    for (let i = 1; i < startDay; i++) {
        const emptyCell = document.createElement("span");

        emptyCell.classList.add("empty-day");
        adminDateCalendarDays.appendChild(emptyCell);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = day;
        button.dataset.date = formatAdminDateForInput(date);

        if (
            reservationDateFilter &&
            reservationDateFilter.value === button.dataset.date
        ) {
            button.classList.add("active");
        }

        button.addEventListener("click", function() {
            reservationDateFilter.value = button.dataset.date;

            adminDateDropdownToggle.textContent =
                formatAdminDateForDisplay(date);

            adminDateCalendarDays
                .querySelectorAll("button")
                .forEach(btn => {
                    btn.classList.remove("active");
                });

            button.classList.add("active");
            adminDateDropdownMenu.classList.add("hidden");

            renderReservations();
        });

        adminDateCalendarDays.appendChild(button);
    }
}



/* event calendar admin */

if (
    reservationDateFilter &&
    adminDateDropdown &&
    adminDateDropdownToggle &&
    adminDateDropdownMenu
) {
    renderAdminCalendar();

    adminDateDropdownToggle.addEventListener("click", function() {
        adminDateDropdownMenu.classList.toggle("hidden");
    });

    adminPrevMonth.addEventListener("click", function() {
        adminCalendarDate.setMonth(adminCalendarDate.getMonth() - 1);
        renderAdminCalendar();
    });

    adminNextMonth.addEventListener("click", function() {
        adminCalendarDate.setMonth(adminCalendarDate.getMonth() + 1);
        renderAdminCalendar();
    });

    if (adminClearDate) {
        adminClearDate.addEventListener("click", function() {
            reservationDateFilter.value = "";

            adminDateDropdownToggle.textContent =
                "Filtrează după dată";

            adminDateCalendarDays
                .querySelectorAll("button")
                .forEach(button => {
                    button.classList.remove("active");
                });

            adminDateDropdownMenu.classList.add("hidden");

            renderReservations();
        });
    }

    if (adminTodayDate) {
        adminTodayDate.addEventListener("click", function() {
            const today = new Date();

            reservationDateFilter.value =
                formatAdminDateForInput(today);

            adminDateDropdownToggle.textContent =
                formatAdminDateForDisplay(today);

            adminCalendarDate = new Date(today);

            renderAdminCalendar();

            adminDateDropdownMenu.classList.add("hidden");

            renderReservations();
        });
    }

    document.addEventListener("click", function(event) {
        if (!adminDateDropdown.contains(event.target)) {
            adminDateDropdownMenu.classList.add("hidden");
        }
    });
}



/* actualizare automata rezervari */

setInterval(displayReservations, 3000);