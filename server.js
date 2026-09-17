require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname)));
app.get("/health", (_req, res) => res.json({ ok: true, service: "Prestige Ink Studio booking" }));
app.listen(PORT, () => console.log(`Prestige Ink booking page running at http://localhost:${PORT}`));
