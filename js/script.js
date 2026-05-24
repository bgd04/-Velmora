const reservationForm = document.getElementById("reservationForm");
const reservationSuccess = document.getElementById("reservationSuccess");

if (reservationForm && reservationSuccess) {
    reservationForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const formData = new FormData(reservationForm);

        const reservation = {
            name: formData.get("name"),
            email: formData.get("email"),
            phone: formData.get("phone"),
            date: formData.get("date"),
            time: formData.get("time"),
            guests: formData.get("guests"),
            message: formData.get("message")
        };

        try {
            const response = await fetch("/api/reservations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(reservation)
            });

            if (response.ok) {
                reservationForm.style.display = "none";
                reservationSuccess.classList.add("active");
            } else {
                alert("A apărut o eroare la salvarea rezervării.");
            }
        } catch (error) {
            console.error(error);
            alert("Serverul nu răspunde.");
        }
    });
}

const publicMenuContainer = document.getElementById("publicMenuContainer");

if (publicMenuContainer) {
    loadPublicMenu();
}

async function loadPublicMenu() {
    try {
        const response = await fetch("/api/menu");
        const items = await response.json();

        if (!Array.isArray(items) || items.length === 0) {
            publicMenuContainer.innerHTML = `
                <p class="empty-message">
                    Meniul nu conține preparate momentan.
                </p>
            `;
            return;
        }

        const groupedItems = {};

        items.forEach(item => {
            if (!groupedItems[item.category]) {
                groupedItems[item.category] = [];
            }

            groupedItems[item.category].push(item);
        });

        let html = "";

        Object.keys(groupedItems).forEach(category => {
            html += `
                <div class="menu-category">
                    <h2>${category}</h2>
            `;

            groupedItems[category].forEach(item => {
                html += `
                    <div class="menu-item">
                        <div>
                            <h3>${item.name}</h3>
                            <p>${item.description}</p>
                        </div>

                        <span>
                            ${Number(item.price).toFixed(2)} RON
                        </span>
                    </div>
                `;
            });

            html += `
                </div>
            `;
        });

        publicMenuContainer.innerHTML = html;

    } catch (error) {
        console.error(error);

        publicMenuContainer.innerHTML = `
            <p class="empty-message">
                Eroare la încărcarea meniului.
            </p>
        `;
    }
}