// Default starter server for a new AppForge app. The AI generator overwrites
// this file (and adds others) based on the app description, but keeps this
// require('./lib/db') / require('./lib/auth') / express + cookie-parser shape.
const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4100;
app.listen(port, () => console.log(`app listening on ${port}`));
