if(process.env.NODE_ENV != "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const staticPagesRouter = require("./routes/staticPages.js");

// const MONGO_URL = "mongodb://localhost:27017/wandera";
const db_URL = process.env.ATLASDB_URL;

main()
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.error("Error connecting to MongoDB:", err);
    });

async function main() {
    await mongoose.connect(db_URL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

const store = new MongoStore({
    mongoUrl: db_URL,
    crypto: {
        secret: process.env.SECRET
    },
    touchAfter: 24 * 60 * 60
});

store.on("error", (err) => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://wandera-1ivj.onrender.com/auth/google/callback"
},
async (accessToken, refreshToken, profile, done) => {
    try {
        const googleEmail = (profile?.emails?.[0]?.value || "").trim().toLowerCase();

        if (!googleEmail) {
            return done(new Error("Google account does not provide an email address."), null);
        }

        // 1) Prefer account already linked with this Google identity.
        let user = await User.findOne({ googleId: profile.id });

        // 2) If not linked yet, try existing local account by email and link it.
        if (!user) {
            user = await User.findOne({ email: googleEmail });

            if (user && !user.googleId) {
                user.googleId = profile.id;
                await user.save();
            }
        }

        // 3) Create a brand-new user only when no account exists by Google ID or email.
        if (!user) {
            user = new User({
                googleId: profile.id,
                email: googleEmail,
                username: profile.displayName
            });

            await user.save();
        }

        return done(null, user);

    } catch (err) {
        return done(err, null);
    }
}));

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    
    // Determine current page for navbar highlighting
    if (req.path === "/listings") {
        if (req.query.explore) {
            res.locals.currentPage = "explore";
        } else {
            res.locals.currentPage = "home";
        }
    } else if (req.path === "/listings/new") {
        res.locals.currentPage = "add";
    } else {
        res.locals.currentPage = "other";
    }
    
    next();
});

// 🔹 Redirect to Google
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 🔹 Callback from Google
app.get('/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login',
        failureFlash: true
    }),
    (req, res) => {
        req.flash("success", "Logged in with Google!");
        res.redirect('/listings');
    }
);

app.get("/", (req, res) => {
    res.redirect("/listings");
});

app.use("/", userRouter);
app.use("/", staticPagesRouter);

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);

app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next) => {
    let {statusCode = 500, message = "Something went wrong!"} = err;
    res.status(statusCode).render("error.ejs", { message });
});

app.listen(8080, () => {
    console.log("Server is running on port 8080");
});
