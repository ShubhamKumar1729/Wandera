const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const axios = require("axios");
const { moderateImageBuffer } = require("../utils/imageModeration.js");

const User = require("../models/user");

const multer = require("multer");
const cloudinary = require("../cloudConfig.js");
const streamifier = require("streamifier");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const getImageErrorRedirect = (req) => {
  if (req.method === "PUT" && req.params?.id) {
    return `/listings/${req.params.id}/edit`;
  }
  return "/listings/new";
};

const uploadListingImage = (req, res, next) => {
  upload.single("listing[image][url]")(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      req.flash("error", "Image must be smaller than 5MB.");
      return res.redirect(getImageErrorRedirect(req));
    }

    req.flash("error", "Image upload failed. Please try again.");
    return res.redirect(getImageErrorRedirect(req));
  });
};

const moderateListingImage = async (req, res, next) => {
  if (!req.file?.buffer) {
    return next();
  }

  try {
    const moderationResult = await moderateImageBuffer(req.file.buffer);

    if (moderationResult.isUnsafe) {
      req.flash("error", "Sorry, your image is not allowed");
      return res.redirect(getImageErrorRedirect(req));
    }

    return next();
  } catch (error) {
      const imageName = req.file?.originalname || "";

      const fallbackUnsafeImageNamePattern = /(sex|sexual|nude|nudity|porn|xxx|nsfw|adult|violent|gore)/i;

      if (fallbackUnsafeImageNamePattern.test(imageName)) {
        req.flash("error", "Sorry, your image is not allowed");
        return res.redirect(getImageErrorRedirect(req));
      }

      console.error("Image moderation failed:", error?.message || error);
      return next();
  }
};

const fallbackUnsafePattern = /(sex|sexual|nude|nudity|porn|xxx|escort|nsfw|rape|incest|explicit|adult\s+content)/i;

const callModerationApi = async (apiKey, content, model) => {
  return axios.post(
    "https://api.openai.com/v1/moderations",
    {
      model,
      input: content
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 15000
    }
  );
};

const moderateListingContent = async (req, res, next) => {
  const title = req.body?.listing?.title ?? "";
  const description = req.body?.listing?.description ?? "";
  const contentToCheck = `${title}\n${description}`.trim();

  if (!contentToCheck) {
    return next();
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;

  if (!apiKey) {
    if (fallbackUnsafePattern.test(contentToCheck)) {
      req.flash("error", "Sorry, your content is inappropriate");
      return res.redirect("/listings/new");
    }
    return next();
  }

  try {
    let moderationResponse;

    try {
      moderationResponse = await callModerationApi(apiKey, contentToCheck, "omni-moderation-latest");
    } catch (primaryError) {
      const statusCode = primaryError?.response?.status;
      if (statusCode === 400 || statusCode === 404) {
        moderationResponse = await callModerationApi(apiKey, contentToCheck, "text-moderation-latest");
      } else {
        throw primaryError;
      }
    }

    const isFlagged = Boolean(moderationResponse?.data?.results?.[0]?.flagged);

    if (isFlagged) {
      req.flash("error", "Sorry, your content is inappropriate");
      return res.redirect("/listings/new");
    }

    return next();
  } catch (error) {
    if (fallbackUnsafePattern.test(contentToCheck)) {
      req.flash("error", "Sorry, your content is inappropriate");
      return res.redirect("/listings/new");
    }
    return next();
  }
};

const syncBudgetField = (req, res, next) => {
  if (!req.body.listing) {
    req.body.listing = {};
  }

  const rawBudget = req.body.listing.budget ?? req.body.listing.price;

  if (rawBudget !== undefined && rawBudget !== null && rawBudget !== "") {
    const parsedBudget = Number(rawBudget);
    req.body.listing.budget = parsedBudget;
    req.body.listing.price = parsedBudget;
  }

  next();
};

// Index Route
// Create Route
router.route("/")
  .get(wrapAsync(listingController.index))
    .post(
  isLoggedIn,
  uploadListingImage,
  syncBudgetField,
  wrapAsync(moderateListingContent),
  wrapAsync(moderateListingImage),

  wrapAsync(async (req, res, next) => {
    if (!req.file) {
      req.flash("error", "Please upload a destination image.");
      return res.redirect("/listings/new");
    }

    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "wandera_DEV" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    let result;
    try {
      result = await streamUpload();
    } catch (error) {
      req.flash("error", "Image upload failed. Please try again.");
      return res.redirect("/listings/new");
    }

    // only required fields
    req.body.listing.image = {
      url: result.secure_url,
      filename: result.public_id
    };

    next();
  }),

  validateListing,
  wrapAsync(listingController.createListing)
);

// Search Route
router.get("/search", wrapAsync(listingController.index));
        
// New Route
router.get("/new", isLoggedIn, listingController.renderNewForm);

// Show Route
router.post("/:id/wishlist", isLoggedIn, wrapAsync(listingController.toggleWishlist));

// Update Route
// Delete Route
router.route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(
      isLoggedIn, isOwner,
  uploadListingImage,
      syncBudgetField,
      wrapAsync(moderateListingContent),
  wrapAsync(moderateListingImage),
      wrapAsync(async (req, res, next) => {
        if (req.file) {
          const streamUpload = () => {
            return new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                { folder: "wandera_DEV" },
                (error, result) => {
                  if (result) resolve(result);
                  else reject(error);
                }
              );
              streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
          };
          let result;
          try {
            result = await streamUpload();
          } catch (error) {
            req.flash("error", "Image upload failed. Please try again.");
            return res.redirect(`/listings/${req.params.id}/edit`);
          }
          // NOW convert into your schema format
          req.body.listing.image = {
            url: result.secure_url,
            filename: result.public_id
          };
        } else {
          // VERY IMPORTANT (keep old image if no new upload)
          const listing = await Listing.findById(req.params.id);
          req.body.listing.image = listing.image;
        }
        next();
      }), validateListing, wrapAsync(listingController.updateListing))
    .delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing));

// Edit Route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;