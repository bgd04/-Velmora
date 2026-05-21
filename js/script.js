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
