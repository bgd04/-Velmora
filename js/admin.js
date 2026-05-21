const reservationsTable = document.getElementById("reservationsTable");
const clearReservations = document.getElementById("clearReservations");

function formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("ro-RO");
}

function formatDateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("ro-RO");
}

async function displayReservations() {
    try {
        const response = await fetch("/api/reservations");
        const reservations = await response.json();

        if (!Array.isArray(reservations) || reservations.length === 0) {
            reservationsTable.innerHTML = `<p class="empty-message">Nu există rezervări momentan.</p>`;
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

        html += `</tbody></table>`;
        reservationsTable.innerHTML = html;

    } catch (error) {
        console.error(error);
        reservationsTable.innerHTML = `<p class="empty-message">Eroare la încărcarea rezervărilor.</p>`;
    }
}

if (clearReservations) {
    clearReservations.addEventListener("click", async function() {
        const confirmed = confirm("Sigur vrei să ștergi toate rezervările?");

        if (!confirmed) return;

        await fetch("/api/reservations", {
            method: "DELETE"
        });

        displayReservations();
    });
}

displayReservations();
setInterval(displayReservations, 3000);
