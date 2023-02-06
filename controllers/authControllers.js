const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const {
  sendCookies,
  sendUserData,
  setError,
  generateToken,
} = require("../utils/data");
const uaParser = require("ua-parser-js");

//////////Register User Handler
exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  //Validation
  if (!name || !email || !password) {
    setError({
      res,
      message: "Please fill all the fields then process",
    });
  }

  if (password.trim().length <= 7) {
    setError({
      res,
      message: "Password must be up to 7 characters",
    });
  }

  //check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    setError({
      res,
      message: "Email id already exists!",
    });
  }

  //get user agent
  const ua = uaParser(req.headers["user-agent"]);
  const userAgent = [ua.ua];

  ///create new user
  const user = await User.create({
    name,
    email,
    password,
    userAgent,
  });

  /// generate token
  const token = generateToken(user._id);

  if (user) {
    sendCookies(res, token);
    sendUserData(res, user, token);
  } else {
    setError({
      res,
      message: "Invalid user data!!",
    });
  }
});

//////////Login User Handler
exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  //validation
  if (!email || !password) {
    setError({
      res,
      message: "Please fill all the fields then process",
    });
  }

  const user = await User.findOne({ email });
  if (!user) {
    setError({
      res,
      message: "User doesn't found, Please signup!",
    });
  }

  const passwordCorrect = await bcrypt.compare(password, user.password);
  if (!passwordCorrect) {
    setError({
      res,
      message: "Invalid email or password",
    });
  }

  ///Trigger 2FA

  /// generate token
  const token = generateToken(user._id);

  if (user && passwordCorrect) {
    sendCookies(res, token);
    sendUserData(res, user, token);
  } else {
    setError({
      res,
      code: 500,
      message: "Something went wrong,Please Try again!",
    });
  }
});

//////////Logout User
exports.logoutUser = asyncHandler(async (req, res) => {
  sendCookies(res, "", 0);
  return res.status(200).json({ message: "Logout successful" });
});

/////////Get Single User
exports.getUser = asyncHandler(async (req, res) => {
  res.send("cool");
});
