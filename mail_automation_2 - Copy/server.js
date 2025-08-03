const { connectDB } = require("./db");
require("./emailReader"); // Start listening to emails

connectDB();
