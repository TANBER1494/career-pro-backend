const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const app = express();

// 1) Middlewares
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use(cors());
app.use(express.json());

// 2) Routes
app.get("/", (req, res) => {
  res.send("Hello from CareerPro API!");
});

module.exports = app;
