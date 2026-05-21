const adminLoginSection = document.getElementById("adminLoginSection");
const adminPanel = document.getElementById("adminPanel");
const adminLoginForm = document.getElementById("adminLoginForm");
const loginError = document.getElementById("loginError");
const logoutAdmin = document.getElementById("logoutAdmin");

const reservationsTable = document.getElementById("reservationsTable");
const clearReservations = document.getElementById("clearReservations");

function isAdminLoggedIn() {
    return localStorage.getItem("velmora_admin_logged") === "true";
}

function showAdminPanel() {
    adminLoginSection.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    displayReservations();
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
            <table>
                <thead>
                    <tr>
                        <th>Nume</th>
                        <th>Email</th>
                        <th>Telefon</th>
                        <th>Data</th>
                        <th>Ora</th>
                        <th>Persoane</th>
                        <th>Cereri</th>
                        <th>Trimisă la</th>
                    </tr>
                </thead>
                <tbody>
        `;

        reservations.forEach(reservation => {
            html += `
                <tr>
                    <td>${reservation.name}</td>
                    <td>${reservation.email}</td>
                    <td>${reservation.phone}</td>
                    <td>${formatDate(reservation.reservation_date)}</td>
                    <td>${reservation.reservation_time}</td>
                    <td>${reservation.guests}</td>
                    <td>${reservation.message || "-"}</td>
                    <td>${formatDateTime(reservation.created_at)}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        reservationsTable.innerHTML = html;

    } catch (error) {
        console.error(error);
        reservationsTable.innerHTML = `
            <p class="empty-message">Eroare la încărcarea rezervărilor.</p>
        `;
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

setInterval(displayReservations, 3000);