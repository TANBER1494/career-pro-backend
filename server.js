const dotenv = require("dotenv");
const connectDB = require("./config/db");
dotenv.config({ path: "./.env" });

connectDB();

const app = require("./app");

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
