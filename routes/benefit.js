const express = require("express");

const { createBenefit, getBenefit } = require("../controllers/benefit");

const router = express.Router();

router.post("/create", createBenefit);

router.get("/getBenefit/:documentId", getBenefit);

module.exports = router;
