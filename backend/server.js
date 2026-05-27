const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log("Pool MySQL configurat.");

const RESTAURANT_CAPACITY = 40;

function getGuestsNumber(guests) {
    return parseInt(guests, 10) || 0;
}

function getReservationInterval(time) {
    const [hour, minute] = time.split(":").map(Number);
    const reservationMinutes = hour * 60 + minute;

    if (reservationMinutes >= 20 * 60) {
        return {
            start: 18 * 60,
            end: 24 * 60
        };
    }

    return {
        start: Math.max(reservationMinutes - 120, 0),
        end: reservationMinutes + 120
    };
}

function timeToMinutes(time) {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.get("/api/availability", (req, res) => {
    const { date, guests } = req.query;

    if (!date || !guests) {
        return res.status(400).json({
            message: "Data și numărul de persoane sunt obligatorii."
        });
    }

    const requestedGuests = getGuestsNumber(guests);

    const timeSlots = [
        "12:00", "12:30",
        "13:00", "13:30",
        "14:00", "14:30",
        "15:00", "15:30",
        "16:00", "16:30",
        "17:00", "17:30",
        "18:00", "18:30",
        "19:00", "19:30",
        "20:00", "20:30",
        "21:00", "21:30",
        "22:00"
    ];

    const sql = `
        SELECT reservation_time, guests
        FROM reservations
        WHERE reservation_date = ?
        AND status = 'confirmed'
    `;

    db.query(sql, [date], (error, confirmedReservations) => {
        if (error) {
            console.error(error);

            return res.status(500).json({
                message: "Eroare la verificarea disponibilității."
            });
        }

        const unavailableTimes = [];

        timeSlots.forEach(time => {
            const interval = getReservationInterval(time);

            let occupiedSeats = 0;

            confirmedReservations.forEach(reservation => {
                const reservationMinutes =
                    timeToMinutes(reservation.reservation_time);

                if (
                    reservationMinutes >= interval.start &&
                    reservationMinutes <= interval.end
                ) {
                    occupiedSeats += getGuestsNumber(reservation.guests);
                }
            });

            if (occupiedSeats + requestedGuests > RESTAURANT_CAPACITY) {
                unavailableTimes.push(time);
            }
        });

        res.json({
            unavailableTimes
        });
    });
});

app.post("/api/reservations", (req, res) => {
    const { name, email, phone, date, time, guests, message } = req.body;

    if (!name || !email || !phone || !date || !time || !guests) {
        return res.status(400).json({
            message: "Toate câmpurile obligatorii trebuie completate."
        });
    }

    const requestedGuests = getGuestsNumber(guests);
    const interval = getReservationInterval(time);

    const capacitySql = `
        SELECT reservation_time, guests
        FROM reservations
        WHERE reservation_date = ?
        AND status = 'confirmed'
    `;

    db.query(capacitySql, [date], (capacityError, confirmedReservations) => {
        if (capacityError) {
            console.error(capacityError);

            return res.status(500).json({
                message: "Eroare la verificarea disponibilității."
            });
        }

        let occupiedSeats = 0;

        confirmedReservations.forEach(reservation => {
            const reservationMinutes =
                timeToMinutes(reservation.reservation_time);

            if (
                reservationMinutes >= interval.start &&
                reservationMinutes <= interval.end
            ) {
                occupiedSeats += getGuestsNumber(reservation.guests);
            }
        });

        if (occupiedSeats + requestedGuests > RESTAURANT_CAPACITY) {
            return res.status(409).json({
                message:
                    "Ne pare rău, nu mai avem disponibilitate pentru intervalul selectat. Vă rugăm să alegeți altă oră."
            });
        }

        const insertSql = `
            INSERT INTO reservations
            (name, email, phone, reservation_date, reservation_time, guests, message)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
            insertSql,
            [name, email, phone, date, time, guests, message],
            (insertError, result) => {
                if (insertError) {
                    console.error(insertError);

                    return res.status(500).json({
                        message: "Eroare la salvarea rezervării."
                    });
                }

                res.status(201).json({
                    message: "Rezervarea a fost salvată.",
                    reservationId: result.insertId
                });
            }
        );
    });
});

app.get("/api/reservations", (req, res) => {
    const sql = `
        SELECT
            id,
            name,
            email,
            phone,
            reservation_date,
            reservation_time,
            guests,
            message,
            status,
            created_at
        FROM reservations
        ORDER BY created_at ASC
    `;

    db.query(sql, (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                message: "Eroare la citirea rezervărilor."
            });
        }

        res.json(results);
    });
});

app.delete("/api/reservations", (req, res) => {
    db.query("DELETE FROM reservations", (error) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                message: "Eroare la ștergerea rezervărilor."
            });
        }

        res.json({
            message: "Toate rezervările au fost șterse."
        });
    });
});

app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM admins WHERE username = ? AND password = ?";

    db.query(sql, [username, password], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                message: "Eroare la autentificare."
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Date de autentificare incorecte."
            });
        }

        res.json({
            message: "Autentificare reușită.",
            admin: {
                id: results[0].id,
                username: results[0].username,
                role: results[0].role
            }
        });
    });
});

app.patch("/api/reservations/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["pending", "confirmed", "cancelled"];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            message: "Status invalid."
        });
    }

    const sql = "UPDATE reservations SET status = ? WHERE id = ?";

    db.query(sql, [status, id], (error, result) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                message: "Eroare la actualizarea statusului."
            });
        }

        res.json({
            message: "Statusul rezervării a fost actualizat."
        });
    });
});

app.delete("/api/reservations/:id", (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM reservations WHERE id = ?";

    db.query(sql, [id], (error) => {
        if (error) {
            console.error(error);

            return res.status(500).json({
                message: "Eroare la ștergerea rezervării."
            });
        }

        res.json({
            message: "Rezervarea a fost ștearsă."
        });
    });
});

app.get("/api/menu", (req, res) => {

    const sql = `
    SELECT *
    FROM menu_items
    ORDER BY
        CASE category
            WHEN 'Startere' THEN 1
            WHEN 'Fel principal' THEN 2
            WHEN 'Desert' THEN 3
            WHEN 'Vinuri' THEN 4
            ELSE 99
        END,
        category,
        id
`;

    db.query(sql, (error, results) => {

        if (error) {

            console.error(error);

            return res.status(500).json({
                message: "Eroare la citirea meniului."
            });
        }

        res.json(results);
    });
});

app.post("/api/menu", (req, res) => {

    const {
        category,
        name,
        description,
        price
    } = req.body;

    if (
        !category ||
        !name ||
        !description ||
        !price
    ) {

        return res.status(400).json({
            message:
                "Toate câmpurile sunt obligatorii."
        });
    }

    const sql = `
        INSERT INTO menu_items
        (
            category,
            name,
            description,
            price
        )
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            category,
            name,
            description,
            price
        ],
        (error, result) => {

            if (error) {

                console.error(error);

                return res.status(500).json({
                    message:
                        "Eroare la adăugarea preparatului."
                });
            }

            res.status(201).json({
                message:
                    "Preparatul a fost adăugat.",
                id: result.insertId
            });
        }
    );
});

app.put("/api/menu/:id", (req, res) => {
    const { id } = req.params;
    const { category, name, description, price } = req.body;

    if (!category || !name || !description || !price) {
        return res.status(400).json({
            message: "Toate câmpurile sunt obligatorii."
        });
    }

    const sql = `
        UPDATE menu_items
        SET category = ?, name = ?, description = ?, price = ?
        WHERE id = ?
    `;

    db.query(sql, [category, name, description, price, id], (error) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                message: "Eroare la actualizarea preparatului."
            });
        }

        res.json({
            message: "Preparatul a fost actualizat."
        });
    });
});

app.delete("/api/menu/:id", (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM menu_items WHERE id = ?";

    db.query(sql, [id], (error) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                message: "Eroare la ștergerea preparatului."
            });
        }

        res.json({
            message: "Preparatul a fost șters."
        });
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server pornit pe http://localhost:${PORT}`);
});
