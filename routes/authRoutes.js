const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
} = require("../controllers/authControllers");
const { privateRoute } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.get("/login", loginUser);
router.get("/logout", logoutUser);
router.get("/user", privateRoute, getUser);

module.exports = router;
