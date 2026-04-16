const Listing = require("../models/listing");
const User = require("../models/user");
const axios = require("axios");
const https = require("https");

function isProvided(value) {
  return value !== undefined && value !== null && value !== "";
}

function getBudgetValue(listing) {
  if (!listing) {
    return 0;
  }

  const budgetValue = listing.budget ?? listing.price ?? 0;
  return Number(budgetValue) || 0;
}

function buildQueryConditions({ search, country, category, minBudget, maxBudget, owner }) {
  const conditions = [];

  if (owner) {
    conditions.push({ owner });
  }

  if (search) {
    conditions.push({
      $or: [
        { title: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } }
      ]
    });
  }

  if (country) {
    conditions.push({ country });
  }

  if (category) {
    conditions.push({ category: { $regex: category, $options: "i" } });
  }

  const budgetRange = {};

  if (isProvided(minBudget)) {
    budgetRange.$gte = Number(minBudget);
  }

  if (isProvided(maxBudget)) {
    budgetRange.$lte = Number(maxBudget);
  }

  if (Object.keys(budgetRange).length > 0) {
    conditions.push({
      $or: [
        { budget: budgetRange },
        { price: budgetRange }
      ]
    });
  }

  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { $and: conditions };
}

function enrichListings(listings) {
  return listings.map((listing) => {
    const listingObj = listing.toObject();

    if (listing.reviews && listing.reviews.length > 0) {
      const totalRating = listing.reviews.reduce((sum, review) => sum + review.rating, 0);
      listingObj.avgRating = (totalRating / listing.reviews.length).toFixed(1);
    } else {
      listingObj.avgRating = 0;
    }

    return listingObj;
  });
}

async function renderListingsPage(res, listings, options = {}) {
  const enrichedListings = enrichListings(listings);

  if (options.sort === "low") {
    enrichedListings.sort((a, b) => getBudgetValue(a) - getBudgetValue(b));
  }

  if (options.sort === "high") {
    enrichedListings.sort((a, b) => getBudgetValue(b) - getBudgetValue(a));
  }

  return res.render("listings/index.ejs", {
    allListings: enrichedListings,
    pageHeading: options.pageHeading,
    pageSubheading: options.pageSubheading,
    emptyTitle: options.emptyTitle,
    emptyMessage: options.emptyMessage,
    filterAction: options.filterAction || "/listings"
  });
}

module.exports.index = async (req, res) => {
  const { search, minBudget, maxBudget, minPrice, maxPrice, country, sort, category } = req.query;

  const query = buildQueryConditions({
    search,
    country,
    category,
    minBudget: isProvided(minBudget) ? minBudget : minPrice,
    maxBudget: isProvided(maxBudget) ? maxBudget : maxPrice
  });

  let listings = await Listing.find(query).populate("reviews");

  return renderListingsPage(res, listings, {
    sort,
    filterAction: "/listings"
  });
};

module.exports.renderMyExperiences = async (req, res) => {
  if (!req.user || !req.user._id) {
    req.flash("error", "Please log in to view your destinations.");
    return res.redirect("/login");
  }

  const { search, minBudget, maxBudget, minPrice, maxPrice, country, sort, category } = req.query;
  const query = buildQueryConditions({
    owner: req.user._id,
    search,
    country,
    category,
    minBudget: isProvided(minBudget) ? minBudget : minPrice,
    maxBudget: isProvided(maxBudget) ? maxBudget : maxPrice
  });

  const listings = await Listing.find(query).populate("reviews");

  return renderListingsPage(res, listings, {
    sort,
    pageHeading: "My Destinations",
    pageSubheading: "Destinations you have shared",
    emptyTitle: "No destinations yet",
    emptyMessage: "You have not shared any destinations yet.",
    filterAction: "/profile/experiences"
  });
};

module.exports.renderWishlist = async (req, res) => {
  if (!req.user || !req.user._id) {
    req.flash("error", "Please log in to view your wishlist.");
    return res.redirect("/login");
  }

  const { search, minBudget, maxBudget, minPrice, maxPrice, country, sort, category } = req.query;
  const user = await User.findById(req.user._id);
  const wishlistIds = Array.isArray(user?.wishlist) ? user.wishlist : [];

  if (!user || !wishlistIds.length) {
    return renderListingsPage(res, [], {
      pageHeading: "Wishlist",
      pageSubheading: "Destinations you saved for later",
      emptyTitle: "Wishlist is empty",
      emptyMessage: "Save destinations you like and they will appear here.",
      filterAction: "/profile/wishlist"
    });
  }

  const query = buildQueryConditions({
    search,
    country,
    category,
    minBudget: isProvided(minBudget) ? minBudget : minPrice,
    maxBudget: isProvided(maxBudget) ? maxBudget : maxPrice
  });

  query._id = { $in: wishlistIds };

  const wishlistListings = await Listing.find(query).populate("reviews");
  const listingMap = new Map(wishlistListings.map((listing) => [listing._id.toString(), listing]));
  const orderedListings = wishlistIds.map((id) => listingMap.get(id.toString())).filter(Boolean);

  return renderListingsPage(res, orderedListings, {
    sort,
    pageHeading: "Wishlist",
    pageSubheading: "Destinations you saved for later",
    emptyTitle: "Wishlist is empty",
    emptyMessage: "Save destinations you like and they will appear here.",
    filterAction: "/profile/wishlist"
  });
};

module.exports.renderNewForm = (req,res) => {
    res.render("listings/new.ejs");
};

module.exports.toggleWishlist = async (req, res) => {
    const listingId = req.params.id;
  const wantsJson = req.xhr || (req.get("accept") || "").includes("application/json");

    if (!req.isAuthenticated()) {
    if (wantsJson) {
      return res.status(401).json({
        message: "You must be logged in to manage wishlist.",
        loginUrl: "/login"
      });
    }

        req.flash("error", "You must be logged in to manage wishlist.");
        return res.redirect("/login");
    }

  const user = await User.findById(req.user._id);
    if (!user) {
    if (wantsJson) {
      return res.status(404).json({ message: "User not found." });
    }

        req.flash("error", "User not found.");
        return res.redirect("/listings");
    }

  if (!Array.isArray(user.wishlist)) {
    user.wishlist = [];
  }

    const index = user.wishlist.findIndex(id => id.toString() === listingId.toString());
  let saved;
  let message;

    if (index > -1) {
        user.wishlist.splice(index, 1);
    saved = false;
    message = "Removed from your wishlist.";
    } else {
        user.wishlist.push(listingId);
    saved = true;
    message = "Added to your wishlist.";
    }

    await user.save();

  if (wantsJson) {
    return res.json({
      saved,
      message
    });
  }

  req.flash("success", message);
    res.redirect(req.get("Referer") || "/listings");
};


module.exports.showListing = async (req, res)=> {
    let {id} = req.params;

    const listing = await Listing.findById(id).populate({
        path: "reviews",
        populate: { path: "author" }
    }).populate("owner");

    if(!listing) {
      req.flash("error", "Destination you requested does not exist");
        return res.redirect("/listings");
    }

    // ✅ Calculate average rating
    let totalReviews = listing.reviews.length;
    let avgRating = 0;

    if (totalReviews > 0) {
        let sum = 0;
        listing.reviews.forEach(r => sum += r.rating);
        avgRating = sum / totalReviews;
    }

    res.render("listings/show.ejs", {
      listing,
      avgRating,
      totalReviews,
      bodyClass: "show-page",
      pageStyles: '<link rel="stylesheet" href="/css/show.css">'
    });
};

function getCoordinates(location) {
    return new Promise((resolve, reject) => {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;

        https.get(url, {
            headers: { "User-Agent": "wanderlust-app" }
        }, (res) => {
            let data = "";

            res.on("data", chunk => data += chunk);
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          const statusError = new Error(`Geocoding service returned status ${res.statusCode}`);
          statusError.code = "GEOCODING_HTTP_ERROR";
          return reject(statusError);
        }

        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (parseError) {
          parseError.code = "GEOCODING_PARSE_ERROR";
          reject(parseError);
        }
      });
        }).on("error", reject);
    });
}

module.exports.createListing = async (req, res) => {
    try {
        const result = await getCoordinates(req.body.listing.location);

    if (!Array.isArray(result) || result.length === 0) {
            req.flash("error", "Location not found!");
            return res.redirect("/listings/new");
        }

        const data = result[0];
    const longitude = Number.parseFloat(data?.lon);
    const latitude = Number.parseFloat(data?.lat);

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      req.flash("error", "Could not verify this location. Please try a more specific place.");
      return res.redirect("/listings/new");
    }

        const budgetValue = Number(req.body.listing.budget ?? req.body.listing.price ?? 0);
        const newListing = new Listing({
          ...req.body.listing,
          status: "approved",
          budget: budgetValue,
          price: budgetValue
        });
        newListing.owner = req.user._id;

        // ✅ THIS IS THE KEY FIX
        newListing.geometry = {
            type: "Point",
          coordinates: [longitude, latitude]
        };

        await newListing.save();

        req.flash("success", "Destination approved and shared!");
        res.redirect("/listings");

    } catch (err) {
      console.log(err);

      if (err && err.name === "ValidationError") {
        req.flash("error", "Please check your listing details and try again.");
        return res.redirect("/listings/new");
      }

      if (err && (
        err.code === "ENOTFOUND" ||
        err.code === "ECONNRESET" ||
        err.code === "ETIMEDOUT" ||
        err.code === "GEOCODING_HTTP_ERROR" ||
        err.code === "GEOCODING_PARSE_ERROR"
      )) {
        req.flash("error", "Could not verify location right now. Please try again.");
        return res.redirect("/listings/new");
      }

      const isProduction = process.env.NODE_ENV === "production";
      const debugMessage = err && err.message ? `Could not create destination: ${err.message}` : "Could not create destination. Please try again.";
      req.flash("error", isProduction ? "Could not create destination. Please try again." : debugMessage);
      res.redirect("/listings/new");
    }
};

module.exports.renderEditForm = async (req, res)=> {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if(!listing) {
      req.flash("error", "Destination you requested does not exist");
        return res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
    res.render("listings/edit.ejs",{ listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;

    try {
        // 🔥 Get new coordinates
        const result = await getCoordinates(req.body.listing.location);

        if (!Array.isArray(result) || result.length === 0) {
            req.flash("error", "Location not found!");
            return res.redirect(`/listings/${id}/edit`);
        }

        const data = result[0];
        const longitude = Number.parseFloat(data?.lon);
        const latitude = Number.parseFloat(data?.lat);

        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
          req.flash("error", "Could not verify this location. Please try a more specific place.");
          return res.redirect(`/listings/${id}/edit`);
        }

        // ✅ Update both data + geometry
        const budgetValue = Number(req.body.listing.budget ?? req.body.listing.price ?? 0);

        let updatedData = {
            ...req.body.listing,
          budget: budgetValue,
          price: budgetValue,
            geometry: {
                type: "Point",
                coordinates: [longitude, latitude]
            }
        };

        await Listing.findByIdAndUpdate(id, updatedData);

        req.flash("success", "Destination updated!");
        res.redirect(`/listings/${id}`);

    } catch (err) {
        console.log(err);

        if (err && (
          err.code === "ENOTFOUND" ||
          err.code === "ECONNRESET" ||
          err.code === "ETIMEDOUT" ||
          err.code === "GEOCODING_HTTP_ERROR" ||
          err.code === "GEOCODING_PARSE_ERROR"
        )) {
          req.flash("error", "Could not verify location right now. Please try again.");
          return res.redirect(`/listings/${id}/edit`);
        }

        req.flash("error", "Could not update destination. Please try again.");
        res.redirect(`/listings/${id}/edit`);
    }
};

module.exports.destroyListing = async (req,res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
  req.flash("success", "Destination deleted!");
    res.redirect("/listings");
};