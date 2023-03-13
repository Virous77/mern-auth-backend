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
const Cryptr = require("cryptr");
const cryptr = new Cryptr(process.env.CRYPTR_KEY);
const parser = require("ua-parser-js");

//////////Register User Handler
exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  //Validation
  if (!name || !email || !password) {
    setError({
      res,
      message: "Please fill all the fields then proceeds!",
    });
  }

  if (password.trim().length <= 7) {
    setError({
      res,
      message: "Password must be up to 8 characters",
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

  // ///Trigger 2FA
  const ua = parser(req.headers["user-agent"]);
  const thisUgerAgent = ua.ua;
  const allowedAgent = user.userAgent.includes(thisUgerAgent);

  if (!allowedAgent) {
    //generate 6 digit code.
    const loginCode = Math.floor(100000 + Math.random() * 900000);

    //encrypt login token before saving in DB
    const encryptedLoginCode = cryptr.encrypt(loginCode.toString());

    ///Delete token if it's exists in DB
    let userToken = await Token.findOne({ useId: user._id });

    if (userToken) {
      await userToken.deleteOne();
    }

    //Hash token and save to DB
    await new Token({
      userId: user.id,
      lToken: encryptedLoginCode,
      createdAt: Date.now(),
      expiredAt: Date.now() + 60 * (60 * 1000),
    }).save();

    setError({
      res,
      message: "Check your email for login code.",
    });
    return;
  }

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

//// Forgot password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    setError({
      res,
      message: "No user with this email",
    });
  }

  ///Delete token if it's exists in DB
  let token = await Token.findOne({ useId: user._id });

  if (token) {
    await token.deleteOne();
  }

  //Create reset token and save
  const resetToken = crypto.randomBytes(32).toString("hex") + user._id;

  //Hash token and save to DB
  const hashedToken = hashToken(resetToken);

  await new Token({
    userId: user.id,
    rToken: hashedToken,
    createdAt: Date.now(),
    expiredAt: Date.now() + 60 * (60 * 1000),
  }).save();

  //Construct resetUrl token
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const subject = "Password reset - Virous Team ";
  const send_to = user.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "noreply@virous.com";
  const template = "forgotPassword";
  const name = user.name;
  const link = resetUrl;

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
    res.status(200).json({ message: "Password reset email sent!" });
  } catch (error) {
    console.log(error);
    setError({
      res,
      code: 500,
      message: "Email not sent, Please try again",
    });
  }
});

/// Reset password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { password } = req.body;

  const hashedToken = hashToken(resetToken);

  const userToken = await Token.findOne({
    rToken: hashedToken,
  });

  if (!userToken) {
    setError({
      res,
      message: "Invalid or Expired token",
    });
  }

  /////Find user
  const user = await User.findOne({ _id: userToken.userId });

  ////Now reset password
  user.password = password;
  await user.save();
  res.status(200).json({ message: "Password reset successful!" });
});

/// Change password
exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { oldPassword, password } = req.body;

  if (!oldPassword || !password) {
    setError({
      res,
      message: "Please enter old and new password",
    });
  }

  ///check if password is correct
  const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

  //save new password

  if (passwordIsCorrect) {
    user.password = password;
    await user.save();
    res.status(200).json({ message: "Password changed successful" });
  } else {
    setError({
      res,
      message: "Old Password is incorrect!",
    });
  }
});

////send Login code
exports.sendLoginCode = asyncHandler(async (req, res) => {
  const { email } = req.params;

  const user = await User.findOne({ email });

  if (!user) {
    setError({
      res,
      message: "No user with this email",
    });
  }

  ///Find Login code in DB
  let userToken = await Token.findOne({
    userId: user._id,
    expiredAt: { $gt: Date.now() },
  });

  if (!userToken) {
    setError({
      res,
      message: "Invalid or Expired token, Login agin!",
    });
  }

  const loginCode = userToken.lToken;
  const sendRealCode = cryptr.decrypt(loginCode);

  ///Send login code
  const subject = "Login Access code - Virous Team ";
  const send_to = email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "noreply@virous.com";
  const template = "loginCode";
  const name = user.name;
  const link = sendRealCode;

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
    res.status(200).json({ message: "Login code email sent!" });
  } catch (error) {
    console.log(error);
    setError({
      res,
      code: 500,
      message: "Email not sent, Please try again",
    });
  }
});

exports.loginWithCode = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const { loginCode } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    setError({
      res,
      message: "No user with this email",
    });
  }

  ///Find Login code in DB
  let userToken = await Token.findOne({
    userId: user._id,
    expiredAt: { $gt: Date.now() },
  });

  if (!userToken) {
    setError({
      res,
      message: "Invalid or Expired token, Login agin!",
    });
  }

  const sendRealCode = cryptr.decrypt(userToken.lToken);

  if (loginCode === sendRealCode) {
    ///Register user agent
    const ua = parser(req.headers["user-agent"]);
    const thisUgerAgent = ua.ua;
    user.userAgent.push(thisUgerAgent);
    await user.save();

    const token = generateToken(user._id);

    sendCookies(res, token);
    sendUserData(res, user, token);
  } else {
    setError({
      res,
      code: 400,
      message: "Incorrect login code, Please try again!",
    });
  }
});
