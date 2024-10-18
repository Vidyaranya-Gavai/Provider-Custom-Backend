const nodemailer = require("nodemailer");
const jwtP = require("jsonwebtoken");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

function sendEmail(email, otp) {
  const mailOptions = {
    from: "vidyaranya.gavai@tekditechnologies.com",
    to: email,
    subject: "OTP for Verification",
    text: `Your OTP for verification is: ${otp}`,
  };

  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    auth: {
      user: "vidyaranya.gavai@tekditechnologies.com",
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log("Error Ocurred: ", err);
    } else {
      console.log("OTP Sent: ", info.response);
    }
  });
}

function getWeekRange(date) {
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );

  const dayOfWeek = utcDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const startDate = new Date(utcDate.getTime());
  const endDate = new Date(utcDate.getTime());

  // Calculate start and end dates of the week
  startDate.setDate(startDate.getDate() - dayOfWeek); // Move to the previous Sunday
  endDate.setDate(endDate.getDate() + (6 - dayOfWeek)); // Move to the next Saturday

  return {
    startDate,
    endDate,
  };
}

async function getAllApplicants(benefits) {
  const array = await Promise.all(
    benefits.map(async (benefit) => {
      const applicant_entries = await fetch(
        `${process.env.STRAPI_URL}/api/applications?filters[content_id][$eq]=${benefit.id}&pagination[pageSize]=100`
      );
      const applicant_entries_json = await applicant_entries.json();
      console.log(
        `Benfit ${benefit.id} applicants: `,
        applicant_entries_json.data.length
      );
      return applicant_entries_json.data;
    })
  );

  return array.flat();
}

async function getCountOfApplicantsPerBenefit(benefits) {
  const counts = await Promise.all(
    benefits.map(async (benefit) => {
      const applicant_entries = await fetch(
        `${process.env.STRAPI_URL}/api/applications?filters[content_id][$eq]=${benefit.id}`
      );
      const applicant_entries_json = await applicant_entries.json();
      return {
        id: benefit.id,
        title: benefit.name,
        totalApplications: applicant_entries_json.meta.pagination.total,
        totalDisbursed: 100000,
      };
    })
  );

  return counts;
}

async function getBenefitSummary(benefits) {
  const summary = await Promise.all(
    benefits.map(async (benefit) => {
      const applicant_entries = await fetch(
        `${process.env.STRAPI_URL}/api/applications?filters[content_id][$eq]=${benefit.id}`
      );
      const applicant_entries_json = await applicant_entries.json();
      return {
        id: benefit.id,
        documentId: benefit.documentId,
        name: benefit.name,
        applicants: applicant_entries_json.meta.pagination.total,
        approved: applicant_entries_json.data.filter(
          (obj) => obj.application_status === "approved"
        ).length,
        rejected: applicant_entries_json.data.filter(
          (obj) => obj.application_status === "rejected"
        ).length,
        disbursalPending: applicant_entries_json.meta.pagination.total,
        deadline: benefit.application_deadline,
        status: "active",
      };
    })
  );

  return summary;
}

async function getApplicantsBetweenDates(benefits) {
  const range = getWeekRange(new Date());
  let applicants = await getAllApplicants(benefits);

  applicants = applicants.filter((obj) => {
    const date = new Date(obj.application_date);
    date >= range.startDate && date <= range.endDate;
  });

  return applicants;
}

async function getApplicationOverview(id) {
  let benefitsData = await fetch(
    `${process.env.STRAPI_URL}/api/scholarships?filters[provider][id][$eq]=${id}`
  );
  benefitsData = await benefitsData.json();

  let benefits = benefitsData.data;

  let allApplicants = await getAllApplicants(benefits);

  const submittedCount = allApplicants.length;
  const approvedCount = allApplicants.filter(
    (obj) => obj.application_status === "approved"
  ).length;
  const rejectedCount = allApplicants.filter(
    (obj) => obj.application_status === "rejected"
  ).length;

  const application_overview = [
    {
      id: 1,
      label: "Total Applicants",
      count: submittedCount,
    },
    {
      id: 2,
      label: "Accepted Applicants",
      count: approvedCount,
    },
    {
      id: 3,
      label: "Rejected Applicants",
      count: rejectedCount,
    },
  ];

  return application_overview;
}

async function getFinancialOverview(id) {
  let benefitsData = await fetch(
    `${process.env.STRAPI_URL}/api/scholarships?filters[provider][id][$eq]=${id}&populate[sponsors]=*`
  );
  benefitsData = await benefitsData.json();

  let benefits = benefitsData.data;
  let totalAmt = 0,
    totalSponsors = 0;

  benefits.forEach((benefit) => {
    totalAmt += benefit.price;
    totalSponsors += benefit.sponsors.length;
  });

  return {
    totalBudget: totalAmt,
    totalSponsors: totalSponsors,
    utilized: totalAmt * 0.7,
    remaining: totalAmt * 0.3,
  };
}

async function getTop3benefits(id) {
  let benefitsData = await fetch(
    `${process.env.STRAPI_URL}/api/scholarships?filters[provider][id][$eq]=${id}`
  );
  benefitsData = await benefitsData.json();

  let benefits = benefitsData.data;
  let counts = await getCountOfApplicantsPerBenefit(benefits);

  counts.sort((a, b) => b.totalApplications - a.totalApplications);

  return counts;
}

async function getAllBenefitsSummary(id) {
  let benefitsData = await fetch(
    `${process.env.STRAPI_URL}/api/scholarships?filters[provider][id][$eq]=${id}`
  );
  benefitsData = await benefitsData.json();

  let benefits = benefitsData.data;
  const summary = await getBenefitSummary(benefits);
  return summary;
}

async function getVisualData(id) {
  let benefitsData = await fetch(
    `${process.env.STRAPI_URL}/api/scholarships?filters[provider][id][$eq]=${id}`
  );
  benefitsData = await benefitsData.json();

  let benefits = benefitsData.data;
  const applicants = await getAllApplicants(benefits);

  const gender = [
    {
      label: "male",
      count: applicants.filter(
        (obj) => obj.gender.toLocaleLowerCase() === "male"
      ).length,
    },
    {
      label: "female",
      count: applicants.filter(
        (obj) => obj.gender.toLocaleLowerCase() === "female"
      ).length,
    },
    {
      label: "other",
      count: applicants.filter(
        (obj) => obj.gender.toLocaleLowerCase() === "other"
      ).length,
    },
  ];

  const caste = [
    {
      label: "sc",
      count: applicants.filter((obj) => obj.caste.toLocaleLowerCase() === "sc")
        .length,
    },
    {
      label: "st",
      count: applicants.filter((obj) => obj.caste.toLocaleLowerCase() === "st")
        .length,
    },
    {
      label: "obc",
      count: applicants.filter((obj) => obj.caste.toLocaleLowerCase() === "obc")
        .length,
    },
    {
      label: "general",
      count: applicants.filter(
        (obj) => obj.caste.toLocaleLowerCase() === "general"
      ).length,
    },
  ];

  const ratio = [
    {
      label: "Day scholar",
      count: applicants.filter((obj) => obj.resident_type === "Dayscholar")
        .length,
    },
    {
      label: "Hosteler",
      count: applicants.filter((obj) => obj.resident_type === "Hosteler")
        .length,
    },
  ];

  const standard = [
    {
      label: "9",
      count: applicants.filter((obj) => obj.class === 9).length,
    },
    {
      label: "10",
      count: applicants.filter((obj) => obj.class === 10).length,
    },
  ];

  return {
    gender,
    caste,
    ratio,
    standard,
  };
}

exports.registerProvider = async (req, res) => {
  const { email, otp } = req.body;

  try {
    let data = await fetch(
      `${process.env.STRAPI_URL}/api/otps?filters[email][$eq]=${email}&sort[0]=createdAt:desc`
    );
    data = await data.json();

    if (data.data.length == 0) {
      return res.status(400).json({
        success: false,
        message: "OTP not matched",
      });
    }

    const row = data.data[0];

    const expiry = new Date(row.expiry);
    const now = new Date();

    if (expiry < now) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (row.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "OTP not matched",
      });
    }

    let result = await fetch(
      `${process.env.STRAPI_URL}/api/auth/local/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: row.name,
          email: row.email,
          password: row.name,
        }),
      }
    );
    result = await result.json();

    if (result.error) {
      console.log("Error in registration: ", error);
      return res.status(500).json({
        success: false,
        message: "Error in registration",
        error: result.error,
      });
    }

    await fetch(`${process.env.STRAPI_URL}/api/otps/${row.documentId}`, {
      method: "DELETE",
    });

    return res.status(200).json({
      success: true,
      message: "Registered successfully...",
      result,
    });
  } catch (error) {
    console.log("Error in reg: ", error);
    return res.status(500).json({
      success: false,
      message: "Error in registration...",
      error,
    });
  }
};

exports.login = async (req, res) => {
  const { email, otp } = req.body;

  try {
    let data = await fetch(
      `${process.env.STRAPI_URL}/api/otps?filters[email][$eq]=${email}&sort[0]=createdAt:desc`
    );
    data = await data.json();

    if (data.data.length == 0) {
      return res.status(400).json({
        success: false,
        message: "OTP not matched",
      });
    }

    const row = data.data[0];

    const expiry = new Date(row.expiry);
    const now = new Date();

    if (expiry < now) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (row.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "OTP not matched",
      });
    }

    data = await fetch(
      `${process.env.STRAPI_URL}/api/users?filters[email][$eq]=${email}`
    );
    data = await data.json();
    data = data[0];

    let result = await fetch(`${process.env.STRAPI_URL}/api/auth/local`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: email,
        password: data.username,
      }),
    });
    result = await result.json();

    if (result.error) {
      console.log("Error in login: ", result.error);
      return res.status(500).json({
        success: false,
        message: "Error in login",
        error: result.error,
      });
    }

    await fetch(`${process.env.STRAPI_URL}/api/otps/${row.documentId}`, {
      method: "DELETE",
    });

    return res.status(200).json({
      success: true,
      message: "Logged in successfully...",
      result,
    });
  } catch (error) {
    console.log("Error in login: ", error);
    return res.status(500).json({
      success: false,
      message: "Error in login...",
      error,
    });
  }
};

exports.otpForReg = async (req, res) => {
  const { email, name } = req.body;

  let data = await fetch(
    `${process.env.STRAPI_URL}/api/users?filters[email][$eq]=${email}`
  );
  data = await data.json();

  if (data.length != 0) {
    return res.status(400).json({
      success: false,
      message: "Provider with this email already exists, try login",
    });
  }

  const otp = generateOTP();

  const body = {
    email,
    name,
    otp,
    expiry: Date.now() + 3600000,
  };

  let result = await fetch(`${process.env.STRAPI_URL}/api/otps`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: body,
    }),
  });
  result = await result.json();

  if (result.error) {
    console.log("Strapi Error: ", result.error);
    return res.status(400).json({
      success: false,
      message: "Error occured, try again",
      error: result.error,
    });
  }

  sendEmail(email, otp);

  return res.status(200).json({
    success: true,
    message: `OTP sent to ${email}`,
  });
};

exports.otpForLog = async (req, res) => {
  const { email } = req.body;

  try {
    let data = await fetch(
      `${process.env.STRAPI_URL}/api/users?filters[email][$eq]=${email}`
    );
    data = await data.json();

    if (data.length == 0) {
      return res.status(400).json({
        success: false,
        message: "Provider with this email does not exist, try registering",
      });
    }

    const otp = generateOTP();

    const body = {
      email,
      otp,
      expiry: Date.now() + 3600000,
    };

    let result = await fetch(`${process.env.STRAPI_URL}/api/otps`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: body,
      }),
    });
    result = await result.json();

    if (result.error) {
      console.log("Strapi Error: ", result.error);
      return res.status(400).json({
        success: false,
        message: "Error occured, try again",
        error: result.error,
      });
    }

    sendEmail(email, otp);

    return res.status(200).json({
      success: true,
      message: `OTP sent to ${email}`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in OTP...",
      error,
    });
  }
};

exports.getOverview = async (req, res) => {
  try {
    // let jwt = req.headers.authorization;

    // if (!jwt) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Invalid JWT Token",
    //   });
    // }
    // jwt = jwtP.decode(jwt);
    const { id } = req.params;

    const application_overview = await getApplicationOverview(id);
    const top_3_benefits = await getTop3benefits(id);
    const benefit_summary = await getAllBenefitsSummary(id);
    const visualData = await getVisualData(id);
    const financialOverview = await getFinancialOverview(id);

    return res.status(200).json({
      application_overview,
      financialOverview,
      top_3_benefits,
      benefit_summary,
      visualData,
    });
  } catch (error) {
    console.log("Error in Dashboard API: ", error);
    return res.status(500).json({
      success: false,
      message: "Error in Dashboard API",
      error,
    });
  }
};
