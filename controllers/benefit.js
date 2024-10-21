const jwtP = require("jsonwebtoken");

validateDeadline = (application_deadline, extended_deadline) => {
  const ad = new Date(application_deadline);

  if (extended_deadline == undefined) return true;
  const ed = new Date(extended_deadline);

  return ad < ed;
};

validateSponsorShares = (sponsors) => {
  let sum = 0;

  for (let i = 0; i < sponsors.length; i++) {
    sum += sponsors[i].share_percent;
  }

  return sum == 100;
};

exports.createBenefit = async (req, res) => {
  try {
    const benefit = req.body;
    const jwt = req.headers.authorization;

    if (benefit.data.is_published) {
      if (
        !validateDeadline(
          benefit.data.application_deadline,
          benefit.data.extended_deadline
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Extended deadline should be none or greater than application deadline",
        });
      }

      if (!validateSponsorShares(benefit.data.sponsors)) {
        return res.status(400).json({
          success: false,
          message: "Sum of shares of all sponsors should be 100",
        });
      }
    }

    const strapi_result = await fetch(
      `${process.env.STRAPI_URL}/api/scholarships`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(benefit),
      }
    );
    const result = await strapi_result.json();

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Benefit Created Successfully",
      result,
    });
  } catch (error) {
    console.log("Error in createing benefit:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error,
    });
  }
};

exports.getBenefitDetails = async (req, res) => {
  try {
    const { documentId } = req.params;

    // let jwt = req.headers.authorization;
    // jwt = jwtP.decode(jwt);
    // let id;

    // if (jwt && jwt.id) id = jwt.id;
    // else id = undefined;

    let benefit = await fetch(
      `${process.env.STRAPI_URL}/api/scholarships/${documentId}?populate[provider][fields]=id&populate[sponsors]=*&fields=price,application_deadline`
    );
    benefit = await benefit.json();

    if (benefit.error) {
      return res.status(400).json({
        success: false,
        error: benefit.error,
      });
    }
    benefit = benefit.data;

    // if (!id || id !== benefit.provider.id) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Unauthorized to access this resource",
    //   });
    // }

    return res.status(200).json({
      success: true,
      benefit,
    });
  } catch (error) {
    console.log("Error in getting benefit:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error,
    });
  }
};
