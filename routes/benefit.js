const express = require("express");

const { createBenefit, getBenefitDetails } = require("../controllers/benefit");

const router = express.Router();

router.post("/create", createBenefit);

router.get("/getBenefit/:documentId", getBenefitDetails);

module.exports = router;
