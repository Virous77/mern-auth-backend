const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const { setError } = require("../utils/data");

const privateRoute = asyncHandler(async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      setError({
        res,
        code: 401,
        message: "Not authorized. please login!",
      });
    }

    //Verify Token
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    ///Get userId from token
    const user = await User.findById(verified.id).select("-password");

    if (!user) {
      setError({
        res,
        code: 404,
        message: "User not found!",
      });
    }

    if (!user.role === "suspended") {
      setError({
        res,
        code: 400,
        message: "User suspended, Please contact support",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    setError({
      res,
      code: 401,
      message: "Not authorized. please login!",
    });
  }
});

module.exports = {
  privateRoute,
};
