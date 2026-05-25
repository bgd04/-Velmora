const adminLoginSection = document.getElementById("adminLoginSection");
const adminPanel = document.getElementById("adminPanel");
const adminLoginForm = document.getElementById("adminLoginForm");
const loginError = document.getElementById("loginError");
const logoutAdmin = document.getElementById("logoutAdmin");

const reservationsTable = document.getElementById("reservationsTable");
const clearReservations = document.getElementById("clearReservations");
const menuItemForm = document.getElementById("menuItemForm");
const menuItemsTable = document.getElementById("menuItemsTable");

const deleteModal = document.getElementById("deleteModal");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");

let reservationToDelete = null;

const statusLabels = {
    pending: "În așteptare",
    confirmed: "Confirmată",
    cancelled: "Anulată"
};

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
                loginError.textContent = data.message || "Autentificare eșuată.";
                return;
            }

            localStorage.setItem("velmora_admin_logged", "true");
            localStorage.setItem("velmora_admin_username", data.admin.username);
            localStorage.setItem("velmora_admin_role",data.admin.role);

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

function formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("ro-RO");
}

function formatDateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("ro-RO");
}

async function displayReservations() {
    if (!isAdminLoggedIn()) {
        return;
    }

    try {
        const response = await fetch("/api/reservations");
        const reservations = await response.json();

        if (!Array.isArray(reservations) || reservations.length === 0) {
            reservationsTable.innerHTML = `
                <p class="empty-message">Nu există rezervări momentan.</p>
            `;
            return;
        }

        let html = `
            <div class="reservation-cards">
        `;

        reservations.forEach(reservation => {
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

                    <div class="reservation-card-footer">
                        <small>Primită la: ${formatDateTime(reservation.created_at)}</small>

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

    } catch (error) {
        console.error(error);

        reservationsTable.innerHTML = `
            <p class="empty-message">Eroare la încărcarea rezervărilor.</p>
        `;
    }
}

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

if (clearReservations) {
    clearReservations.addEventListener("click", async function() {
        const confirmed = confirm("Sigur vrei să ștergi toate rezervările?");

        if (!confirmed) {
            return;
        }

        await fetch("/api/reservations", {
            method: "DELETE"
        });

        displayReservations();
    });
}

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
            const response = await fetch(`/api/reservations/${reservationToDelete}`, {
                method: "DELETE"
            });

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

async function displayMenuItems() {

    try {

        const response = await fetch("/api/menu");

        const items = await response.json();

        if (!Array.isArray(items) || items.length === 0) {

            menuItemsTable.innerHTML = `
                <p class="empty-message">
                    Nu există preparate în meniu.
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
                    </tr>
                </thead>
                <tbody>
        `;

        items.forEach(item => {

            html += `
                <tr>
                    <td>${item.category}</td>
                    <td>${item.name}</td>
                    <td>${item.description}</td>
                    <td>${item.price} Lei</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        menuItemsTable.innerHTML = html;

    } catch (error) {

        console.error(error);

        menuItemsTable.innerHTML = `
            <p class="empty-message">
                Eroare la încărcarea meniului.
            </p>
        `;
    }
}

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

                const response =
                    await fetch("/api/menu", {

                        method: "POST",

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

                displayMenuItems();

            } catch (error) {

                console.error(error);

                alert(
                    "Nu s-a putut adăuga preparatul."
                );
            }
        }
    );
}

setInterval(displayReservations, 3000);