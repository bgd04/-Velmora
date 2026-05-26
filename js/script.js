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





const reservationTimeInput = document.getElementById("reservationTime");
const timeDropdown = document.getElementById("timeDropdown");
const timeDropdownToggle = document.getElementById("timeDropdownToggle");
const timeDropdownMenu = document.getElementById("timeDropdownMenu");

if (reservationTimeInput && timeDropdownToggle && timeDropdownMenu) {
    timeDropdownToggle.addEventListener("click", function() {
        timeDropdownMenu.classList.toggle("hidden");
    });

    timeDropdownMenu.querySelectorAll("button").forEach(button => {
        button.addEventListener("click", function() {
            const selectedTime = button.dataset.time;

            reservationTimeInput.value = selectedTime;
            timeDropdownToggle.textContent = selectedTime;

            timeDropdownMenu.querySelectorAll("button").forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");
            timeDropdownMenu.classList.add("hidden");
        });
    });

    document.addEventListener("click", function(event) {
        if (!timeDropdown.contains(event.target)) {
            timeDropdownMenu.classList.add("hidden");
        }
    });
}






const reservationDateInput = document.getElementById("reservationDate");
const dateDropdown = document.getElementById("dateDropdown");
const dateDropdownToggle = document.getElementById("dateDropdownToggle");
const dateDropdownMenu = document.getElementById("dateDropdownMenu");
const currentMonthLabel = document.getElementById("currentMonthLabel");
const dateCalendarDays = document.getElementById("dateCalendarDays");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");

let calendarDate = new Date();

const monthNames = [
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

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDateForDisplay(date) {
    return date.toLocaleDateString("ro-RO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function renderCalendar() {
    if (!dateCalendarDays || !currentMonthLabel) {
        return;
    }

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    currentMonthLabel.textContent = `${monthNames[month]} ${year}`;

    dateCalendarDays.innerHTML = "";

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDay = firstDay.getDay();

    if (startDay === 0) {
        startDay = 7;
    }

    for (let i = 1; i < startDay; i++) {
        const emptyCell = document.createElement("span");
        emptyCell.classList.add("empty-day");
        dateCalendarDays.appendChild(emptyCell);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = day;
        button.dataset.date = formatDateForInput(date);

        if (reservationDateInput && reservationDateInput.value === button.dataset.date) {
            button.classList.add("active");
        }

        button.addEventListener("click", function() {
            reservationDateInput.value = button.dataset.date;
            dateDropdownToggle.textContent = formatDateForDisplay(date);

            dateCalendarDays.querySelectorAll("button").forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");
            dateDropdownMenu.classList.add("hidden");
        });

        dateCalendarDays.appendChild(button);
    }
}

if (
    reservationDateInput &&
    dateDropdown &&
    dateDropdownToggle &&
    dateDropdownMenu
) {
    renderCalendar();

    dateDropdownToggle.addEventListener("click", function() {
        dateDropdownMenu.classList.toggle("hidden");
    });

    prevMonth.addEventListener("click", function() {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonth.addEventListener("click", function() {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
    });

    document.addEventListener("click", function(event) {
        if (!dateDropdown.contains(event.target)) {
            dateDropdownMenu.classList.add("hidden");
        }
    });
}



const reservationGuestsInput = document.getElementById("reservationGuests");
const guestsDropdown = document.getElementById("guestsDropdown");
const guestsDropdownToggle = document.getElementById("guestsDropdownToggle");
const guestsDropdownMenu = document.getElementById("guestsDropdownMenu");

if (reservationGuestsInput && guestsDropdown && guestsDropdownToggle && guestsDropdownMenu) {
    guestsDropdownToggle.addEventListener("click", function() {
        guestsDropdownMenu.classList.toggle("hidden");
    });

    guestsDropdownMenu.querySelectorAll("button").forEach(button => {
        button.addEventListener("click", function() {
            const selectedGuests = button.dataset.guests;

            reservationGuestsInput.value = selectedGuests;
            guestsDropdownToggle.textContent = selectedGuests;

            guestsDropdownMenu.querySelectorAll("button").forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");
            guestsDropdownMenu.classList.add("hidden");
        });
    });

    document.addEventListener("click", function(event) {
        if (!guestsDropdown.contains(event.target)) {
            guestsDropdownMenu.classList.add("hidden");
        }
    });
}