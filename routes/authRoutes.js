const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updateUser,
  deleteUser,
} = require("../controllers/authControllers");
const { privateRoute } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminDeleteMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.get("/login", loginUser);
router.get("/logout", logoutUser);
router.get("/user", privateRoute, getUser);
router.patch("/update-user", privateRoute, updateUser);

///Admin routes
router.delete("/:id", privateRoute, adminOnly, deleteUser);

module.exports = router;
