import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

// Import routes
import user from "./modules/user/user.route.js";

dotenv.config();
const app = express();
app.use(express.json());

// MongoDB Connection
const _dbURI = process.env.MONGO_DB_URI;
mongoose.connect(_dbURI).then(() => {
  console.log("Connected to Mongo DB");
});

// Image static folder
app.use("/images", express.static("images"));

// Routes
app.use("/api/users", user);

// Local Server
app.listen(process.env.PORT, () =>
  console.log(`Listening to port ${process.env.PORT}`),
);
