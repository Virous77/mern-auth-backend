const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updateUser,
  deleteUser,
  getUsers,
  checkLoginUser,
  changeUserRole,
  sendAutoMatedEmail,
  verificationEmail,
  verifyUser,
  forgotPassword,
  resetPassword,
  changePassword,
  sendLoginCode,
  loginWithCode,
} = require("../controllers/authControllers");
const { privateRoute } = require("../middleware/authMiddleware");
const {
  adminOnly,
  authorOnly,
} = require("../middleware/adminDeleteMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.get("/login", loginUser);
router.get("/logout", logoutUser);
router.get("/user", privateRoute, getUser);
router.patch("/update-user", privateRoute, updateUser);

///Admins routes
router.delete("/:id", privateRoute, adminOnly, deleteUser);
router.get("/get-users", privateRoute, authorOnly, getUsers);

router.get("/login-status", checkLoginUser);
router.post("/user-role", privateRoute, adminOnly, changeUserRole);

router.post("/send-automated-email", privateRoute, sendAutoMatedEmail);
router.post("/verification-email", privateRoute, verificationEmail);
router.patch("/verify-user/:verificationToken", verifyUser);
router.post("/forgot-password", forgotPassword);
router.patch("/reset-password/:resetToken", resetPassword);
router.patch("/change-password", privateRoute, changePassword);
router.post("/send-login-code/:email", sendLoginCode);
router.post("/login-with-code/:email", loginWithCode);

module.exports = router;
