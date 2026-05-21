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

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.post("/api/reservations", (req, res) => {
    const { name, email, phone, date, time, guests, message } = req.body;

    if (!name || !email || !phone || !date || !time || !guests) {
        return res.status(400).json({
            message: "Toate câmpurile obligatorii trebuie completate."
        });
    }

    const sql = `
        INSERT INTO reservations
        (name, email, phone, reservation_date, reservation_time, guests, message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [name, email, phone, date, time, guests, message], (error, result) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                message: "Eroare la salvarea rezervării."
            });
        }

        res.status(201).json({
            message: "Rezervarea a fost salvată.",
            reservationId: result.insertId
        });
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
            created_at
        FROM reservations
        ORDER BY created_at DESC
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server pornit pe http://localhost:${PORT}`);
});
