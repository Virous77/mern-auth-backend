const { setError } = require("../utils/data");
const asyncHandler = require("express-async-handler");

const adminOnly = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    setError({
      res,
      code: 400,
      message: "You are not authorized for this action",
    });
  }
});

const authorOnly = asyncHandler(async (req, res, next) => {
  if (req.user.role === "author" || req.user.role === "admin") {
    next();
  } else {
    setError({
      res,
      code: 400,
      message: "You are not authorized for this action",
    });
  }
});

const verifiedOnly = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.isVerified) {
    next();
  } else {
    setError({
      res,
      code: 400,
      message: "You account is not yet verified.",
    });
  }
});

module.exports = {
  adminOnly,
  authorOnly,
  verifiedOnly,
};
