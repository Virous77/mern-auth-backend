const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const {
  sendCookies,
  sendUserData,
  setError,
  generateToken,
  hashToken,
} = require("../utils/data");
const uaParser = require("ua-parser-js");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/SendEmail");
const Token = require("../models/tokenModel");
const crypto = require("crypto");

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

///////////Change User role
exports.changeUserRole = asyncHandler(async (req, res) => {
  const { role, id } = req.body;

  const user = await User.findById(id);

  if (!user) {
    setError({
      res,
      message: "User not found",
    });
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    message: `User role updated to ${role}`,
  });
});

///////////////////EMAIL FUNCTIONS//////////////////

////Send automated email
exports.sendAutoMatedEmail = asyncHandler(async (req, res) => {
  const { subject, send_to, reply_to, template, url } = req.body;

  if (!subject || !send_to || !reply_to || !template) {
    setError({
      res,
      message: "Missing email parameter!",
    });
  }

  ///get User
  const user = await User.findOne({ email: send_to });

  if (!user) {
    setError({
      res,
      message: "User not found",
    });
  }

  const sent_from = process.env.EMAIL_USER;
  const name = user.name;
  const link = `${process.env.FRONTEND_URL}${url}`;

  console.log(sent_from);

  try {
    await sendEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      link,
      name
    );
    res.status(200).json({ message: "Email sent!" });
  } catch (error) {
    console.log(error);
    setError({
      res,
      code: 500,
      message: "Email not sent, Please try again",
    });
  }
});

///send Verification Email
exports.verificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    setError({
      res,
      message: "User not found",
    });
  }

  if (user.isVerified) {
    setError({
      res,
      message: "User already verified",
    });
  }

  let token = await Token.findOne({ useId: user._id });

  ///Delete token if it's exists in DB
  if (token) {
    await token.deleteOne();
  }

  //Create verification token and save
  const verificationToken = crypto.randomBytes(32).toString("hex") + user._id;

  //Hash token and save to DB
  const hashedToken = hashToken(verificationToken);
  await new Token({
    userId: user.id,
    vToken: hashedToken,
    createdAt: Date.now(),
    expiredAt: Date.now() + 60 * (60 * 1000),
  }).save();

  //Construct verification token
  const verificationUrl = `${process.env.FRONTEND_URL}/VERIFY/${verificationToken}`;

  const subject = "Verify Your account - Virous Team ";
  const send_to = user.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "noreply@virous.com";
  const template = "verifyEmail";
  const name = user.name;
  const link = verificationUrl;

  try {
    await sendEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      link,
      name
    );
    res.status(200).json({ message: " Verification email sent!" });
  } catch (error) {
    console.log(error);
    setError({
      res,
      code: 500,
      message: "Email not sent, Please try again",
    });
  }
});

////verify user
exports.verifyUser = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  const hashedToken = hashToken(verificationToken);

  const userToken = await Token.findOne({
    vToken: hashedToken,
  });

  if (!userToken) {
    setError({
      res,
      message: "Invalid or Expired token",
    });
  }

  /////Find user
  const user = await User.findOne({ _id: userToken.userId });

  if (user.isVerified) {
    setError({
      res,
      message: "User is already verified.",
    });
  }

  ////Now verify user
  user.isVerified = true;
  await user.save();
  res.status(200).json({ message: "Account verified successfully!" });
});
