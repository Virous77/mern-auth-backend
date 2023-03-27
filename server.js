const express = require("express");
const dotenv = require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const router = require("./routes/authRoutes");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://react-authV.vercel.app",
      "https://react-authv.onrender.com/",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use("/api-v1/users", router);
app.get("/", (req, res) => {
  res.send("Hello");
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`server running on ${PORT}`));
  })
  .catch((error) => {
    console.log(error);
  });
