const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const { isLoggedIn, saveRedirectUrl } = require("../middleware.js");
const userController = require("../controllers/users.js");  
const listingController = require("../controllers/listings.js");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.route("/signup")
    .get((req, res) => res.redirect("/listings?modal=signup"))
    .post(wrapAsync(userController.signup));
    
router.post('/signup/request-otp', wrapAsync(userController.requestSignupOtp));

router.route("/login")
    .get((req, res) => res.redirect("/listings?modal=login"))
    .post(saveRedirectUrl, passport.authenticate("local", { failureRedirect: "/listings?modal=login", failureFlash: true }), userController.login);

router.get("/profile", isLoggedIn, userController.renderProfile);
router.get("/profile/experiences", isLoggedIn, wrapAsync(listingController.renderMyExperiences));
router.get("/profile/wishlist", isLoggedIn, wrapAsync(listingController.renderWishlist));
router.post("/profile/username", isLoggedIn, wrapAsync(userController.updateUsername));
router.post("/profile/photo", isLoggedIn, upload.single("profileImage"), wrapAsync(userController.updateProfileImage));
router.post("/profile/photo/delete", isLoggedIn, wrapAsync(userController.deleteProfileImage));
router.post("/profile/delete-account", isLoggedIn, wrapAsync(userController.deleteAccount));
    
router.get("/logout", userController.logout);

module.exports = router;