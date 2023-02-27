const { setError } = require("../utils/data");

const adminOnly = async (req, res) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    setError({
      res,
      code: 400,
      message: "You are not authorized for this action",
    });
  }
};

const authorOnly = async (req, res) => {
  if (req.user.role === "author" || req.user.role === "admin") {
    next();
  } else {
    setError({
      res,
      code: 400,
      message: "You are not authorized for this action",
    });
  }
};

const verifiedOnly = async (req, res) => {
  if (req.user && req.user.isVerified) {
    next();
  } else {
    setError({
      res,
      code: 400,
      message: "You account is not yet verified.",
    });
  }
};

module.exports = {
  adminOnly,
  authorOnly,
  verifiedOnly,
};
