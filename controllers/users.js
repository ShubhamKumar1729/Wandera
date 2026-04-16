const User = require("../models/user.js");
const cloudinary = require("../cloudConfig.js");
const streamifier = require("streamifier");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const nodemailer = require("nodemailer");

const OTP_TTL_MS = 10 * 60 * 1000;
let etherealAccount = null;
let etherealTransporter = null;

async function getOtpMailer() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const isProduction = process.env.NODE_ENV === "production";

    if (host && user && pass) {
        return {
            transporter: nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass }
            }),
            from: process.env.SMTP_FROM || user,
            provider: "smtp"
        };
    }

    if (isProduction) {
        return null;
    }

    if (!etherealAccount) {
        etherealAccount = await nodemailer.createTestAccount();
    }

    if (!etherealTransporter) {
        etherealTransporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: etherealAccount.user,
                pass: etherealAccount.pass
            }
        });
    }

    return {
        transporter: etherealTransporter,
        from: process.env.SMTP_FROM || `Wandera <${etherealAccount.user}>`,
        provider: "ethereal"
    };
}

function generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function jsonOrRedirect(req, res, status, payload, redirectUrl = "/listings?modal=signup") {
    const wantsJson = req.xhr || (req.get("accept") || "").includes("application/json");
    if (wantsJson) {
        return res.status(status).json(payload);
    }

    if (payload?.message) {
        const bucket = status >= 400 ? "error" : "success";
        req.flash(bucket, payload.message);
    }
    return res.redirect(redirectUrl);
}

module.exports.renderSignupForm = (req, res) => {
    res.redirect("/listings?modal=signup");
};

module.exports.requestSignupOtp = async (req, res) => {
    const payload = req.body || {};
    const username = (payload.username || "").trim();
    const email = (payload.email || "").trim().toLowerCase();
    const password = payload.password || "";

    if (!username || !email || !password) {
        return jsonOrRedirect(req, res, 400, { message: "Username, email, and password are required." });
    }

    const existingByUsername = await User.findOne({ username });
    if (existingByUsername) {
        return jsonOrRedirect(req, res, 409, { message: "Username already taken!" });
    }

    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) {
        return jsonOrRedirect(req, res, 409, { message: "Email already in use!" });
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + OTP_TTL_MS;

    req.session.pendingSignup = {
        username,
        email,
        password,
        otp,
        expiresAt
    };

    const mailer = await getOtpMailer();
    const isProduction = process.env.NODE_ENV === "production";

    if (!mailer) {
        return jsonOrRedirect(req, res, 500, { message: "OTP mail service is not configured." });
    }

    try {
        const info = await mailer.transporter.sendMail({
            from: mailer.from,
            to: email,
            subject: "Wandera signup OTP",
            text: `Your Wandera OTP is ${otp}. It expires in 10 minutes.`
        });

        if (mailer.provider === "ethereal") {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log(`[ETHEREAL OTP PREVIEW] ${previewUrl}`);
            }

            return jsonOrRedirect(req, res, 200, {
                message: "Development mail mode is active. Open Ethereal preview to view OTP.",
                previewUrl
            });
        }

        return jsonOrRedirect(req, res, 200, { message: "OTP sent to your email." });
    } catch (error) {
        if (isProduction) {
            return jsonOrRedirect(req, res, 500, { message: "Failed to send OTP email." });
        }

        console.log(`[DEV OTP - EMAIL FAILED] ${email}: ${otp}`);
        console.log(error);
        return jsonOrRedirect(req, res, 200, {
            message: "Email sending failed. OTP generated in server logs for local testing."
        });
    }
};

module.exports.renderProfile = async (req, res) => {
        const user = await User.findById(req.user._id);

        if (!user) {
            req.flash("error", "User not found.");
            return res.redirect("/listings");
        }

        const [myExperiencesCount, myExperiences] = await Promise.all([
            Listing.countDocuments({ owner: req.user._id }),
            Listing.find({ owner: req.user._id }).sort({ _id: -1 }).limit(4)
        ]);

        const wishlistIds = Array.isArray(user.wishlist) ? user.wishlist : [];
        const wishlistCount = wishlistIds.length;
        const previewWishlistIds = wishlistIds.slice(0, 4);

        let wishlistListings = [];
        if (previewWishlistIds.length > 0) {
            const fetchedWishlistListings = await Listing.find({ _id: { $in: previewWishlistIds } });
            const listingMap = new Map(fetchedWishlistListings.map((listing) => [listing._id.toString(), listing]));
            wishlistListings = previewWishlistIds
                .map((id) => listingMap.get(id.toString()))
                .filter(Boolean);
        }

        res.render("users/profile.ejs", {
            user,
            wishlistCount,
            myExperiencesCount,
            myExperiences,
            wishlistListings
        });
};

module.exports.updateUsername = async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "Login required");
        return res.redirect("/login");
    }

    const newUsername = (req.body.username || "").trim();

    if (!newUsername) {
        req.flash("error", "Username cannot be empty.");
        return res.redirect("/profile");
    }

    const existingUser = await User.findOne({ username: newUsername });

    if (existingUser && !existingUser._id.equals(req.user._id)) {
        req.flash("error", "Username already taken!");
        return res.redirect("/profile");
    }

    const user = await User.findById(req.user._id);
    user.username = newUsername;
    await user.save();

    req.flash("success", "Username updated!");
    res.redirect("/profile");
};

module.exports.updateProfileImage = async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "Login required");
        return res.redirect("/login");
    }

    if (!req.file) {
        req.flash("error", "Please choose an image first.");
        return res.redirect("/profile");
    }

    const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "wandera_profile" },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const user = await User.findById(req.user._id);
    user.profileImage = {
        url: uploadResult.secure_url,
        filename: uploadResult.public_id
    };

    await user.save();

    req.flash("success", "Profile picture updated!");
    res.redirect("/profile");
};

module.exports.deleteProfileImage = async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "Login required");
        return res.redirect("/login");
    }

    const user = await User.findById(req.user._id);

    if (!user || !user.profileImage || !user.profileImage.filename) {
        req.flash("error", "No profile picture found.");
        return res.redirect("/profile");
    }

    try {
        await cloudinary.uploader.destroy(user.profileImage.filename);
    } catch (err) {
        console.log(err);
    }

    user.profileImage = undefined;
    await user.save();

    req.flash("success", "Profile picture removed.");
    res.redirect("/profile");
};

module.exports.signup = async  (req, res, next) => {
        try {
            const enteredOtp = (req.body.otp || "").trim();
            const pendingSignup = req.session.pendingSignup;

            if (!pendingSignup) {
                req.flash("error", "Please request OTP first.");
                return res.redirect("/listings?modal=signup");
            }

            if (!enteredOtp) {
                req.flash("error", "Please enter OTP.");
                return res.redirect("/listings?modal=signup");
            }

            if (Date.now() > pendingSignup.expiresAt) {
                delete req.session.pendingSignup;
                req.flash("error", "OTP expired. Please request a new one.");
                return res.redirect("/listings?modal=signup");
            }

            if (enteredOtp !== pendingSignup.otp) {
                req.flash("error", "Invalid OTP.");
                return res.redirect("/listings?modal=signup");
            }

            const existingByUsername = await User.findOne({ username: pendingSignup.username });
            if (existingByUsername) {
                delete req.session.pendingSignup;
                req.flash("error", "Username already taken!");
                return res.redirect("/listings?modal=signup");
            }

            const existingByEmail = await User.findOne({ email: pendingSignup.email });
            if (existingByEmail) {
                delete req.session.pendingSignup;
                req.flash("error", "Email already in use!");
                return res.redirect("/listings?modal=signup");
            }

            const newUser = new User({email: pendingSignup.email, username: pendingSignup.username});
            const registeredUser = await User.register(newUser, pendingSignup.password);
            delete req.session.pendingSignup;
            console.log(registeredUser); 
            req.login(registeredUser, (err) => {
                if(err) {
                    return next(err);
                }
                req.flash("success", "Welcome to Wandera!");
                res.redirect("/listings");
            });
        } catch(e) {
            req.flash("error", e.message);
            res.redirect("/listings?modal=signup");
        }
};

module.exports.renderLoginForm = (req, res) => {
    res.redirect("/listings?modal=login");
};

module.exports.login = async (req, res) => {
    req.flash("success", "Welcome back to Wandera!");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if(err) {
            return next(err);
        }
        req.flash("success", "You are logged out!");
        res.redirect("/listings");
    });
};

module.exports.deleteAccount = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "Login required");
        return res.redirect("/listings?modal=login");
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
        req.flash("error", "User not found.");
        return res.redirect("/listings");
    }

    const userReviews = await Review.find({ author: userId }).select("_id");
    const userReviewIds = userReviews.map((review) => review._id);

    if (userReviewIds.length > 0) {
        await Listing.updateMany(
            { reviews: { $in: userReviewIds } },
            { $pull: { reviews: { $in: userReviewIds } } }
        );
        await Review.deleteMany({ _id: { $in: userReviewIds } });
    }

    const ownedListings = await Listing.find({ owner: userId }).select("_id reviews");
    const ownedListingIds = ownedListings.map((listing) => listing._id);
    const ownedListingReviewIds = ownedListings.flatMap((listing) => listing.reviews || []);

    if (ownedListingReviewIds.length > 0) {
        await Review.deleteMany({ _id: { $in: ownedListingReviewIds } });
    }

    if (ownedListingIds.length > 0) {
        await User.updateMany(
            { wishlist: { $in: ownedListingIds } },
            { $pull: { wishlist: { $in: ownedListingIds } } }
        );

        await Listing.deleteMany({ _id: { $in: ownedListingIds } });
    }

    if (user.profileImage && user.profileImage.filename) {
        try {
            await cloudinary.uploader.destroy(user.profileImage.filename);
        } catch (error) {
            console.log("Profile image deletion failed:", error.message);
        }
    }

    await User.findByIdAndDelete(userId);

    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.session.pendingSignup = null;
        req.flash("success", "Your account and all your content were deleted.");
        return res.redirect("/");
    });
};