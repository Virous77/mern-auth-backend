const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");

const sendEmail = async (
  subject,
  send_to,
  sending_from,
  reply_to,
  template,
  name,
  link
) => {
  ///Email transporter

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },

    tls: {
      rejectUnauthorized: false,
    },
  });

  const handleBarsOptions = {
    viewEngine: {
      extName: ".handlebars",
      partialDir: path.resolve("/views"),
      defaultLayout: false,
    },
    viewPath: path.resolve("/views"),
    extName: ".handlebars",
  };

  ///Options for sending emails
  const options = {
    from: sending_from,
    to: send_to,
    replyTo: reply_to,
    template,
    subject,
    context: {
      name,
      link,
    },
  };
};
