const express = require("express");
const {
  registerProvider,
  otpForReg,
  otpForLog,
  login,
  getOverview,
} = require("../controllers/provider");
const router = express.Router();

router.post("/sendOtpForReg", otpForReg);
router.post("/register", registerProvider);
router.post("/sendOtpForLog", otpForLog);
router.post("/login", login);
router.get("/getApplicationOverview/:id", getOverview);

module.exports = router;
