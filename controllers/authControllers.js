const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwtToken = require("../utils/data");

exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  //Validation
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please fill all the fields then process");
  }

  if (password.trim().length <= 7) {
    res.status(400);
    throw new Error("Password must be up to 7 characters");
  }

  //check if user exists

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("Email id already exists!");
  }

  ///create new user
  const user = await User.create({
    name,
    email,
    password,
  });

  /// generate token
  const token = jwtToken.generateToken(user._id);

  //send http-only cookie

  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400),
    sameSite: "none",
    secure: true,
  });

  if (user) {
    const { _id, name, email, phone, bio, photo, role, isVerified } = user;

    res.status(201).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      isVerified,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data!!");
  }
});
