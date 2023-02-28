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
const jwt = require("jsonwebtoken");

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
  const user = await User.findById(req.user._id);

  if (user) {
    return sendUserData(res, user);
  } else {
    setError({
      res,
      code: 404,
      message: "User not found!",
    });
  }
});

///////Update user
exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  const userData = req.body;

  if (user) {
    const { name, email, phone, bio, photo, role, isVerified } = user;

    user.name = userData.name || name;
    user.phone = userData.phone || phone;
    user.bio = userData.bio || bio;
    user.photo = userData.photo || photo;

    const updatedUser = await user.save();

    sendUserData(res, updatedUser);
  } else {
    setError({
      res,
      code: 404,
      message: "User not found!",
    });
  }
});

///////////Delete user
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = User.findById(req.params.id);

  if (!user) {
    setError({
      res,
      message: "User not found",
    });
  }

  await user.remove();
  res.status(200).json({
    message: "User deleted successfully!",
  });
});

///////////Get Users
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort("-createdAt").select("-password");

  if (!users) {
    setError({
      res,
      message: "User not found",
    });
  }

  res.status(200).json(users);
});

///////////Login Status watch
exports.checkLoginUser = asyncHandler(async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json(false);
  }

  //Verify Token
  const verified = jwt.verify(token, process.env.JWT_SECRET);

  if (verified) {
    return res.json(true);
  } else {
    return res.json(false);
  }
});
