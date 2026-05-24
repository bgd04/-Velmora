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
            status,
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

    const sql =
        "SELECT * FROM menu_items ORDER BY category, id";

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server pornit pe http://localhost:${PORT}`);
});
