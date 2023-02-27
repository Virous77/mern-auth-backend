const jwt = require("jsonwebtoken");

//generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

/////send Cookies
const sendCookies = (res, token, logout) => {
  return res.cookie("token", token, {
    path: "/",
    httpOnly: false,
    expires: new Date(logout || Date.now() + 1000 * 86400),
    sameSite: "none",
    secure: false,
  });
};

////send User-Data
const sendUserData = (res, user, token) => {
  const { _id, name, email, phone, bio, photo, role, isVerified } = user;

  return res.status(200).json({
    _id,
    name,
    email,
    phone,
    bio,
    photo,
    role,
    isVerified,
    token: token && token,
  });
};

///Throw error
const setError = ({ res, code, message }) => {
  const error = () => {
    res.status(code || 400);
    throw new Error(message);
  };
  return error();
};

module.exports = {
  generateToken,
  sendCookies,
  sendUserData,
  setError,
};
