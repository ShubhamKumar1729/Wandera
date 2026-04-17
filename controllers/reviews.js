const Listing = require("../models/listing");
const Review =  require("../models/review");

module.exports.createReview = async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        req.flash("error", "Destination not found");
        return res.redirect("/listings");
    }

    const existingReview = await Review.findOne({
        listing: listing._id,
        author: req.user._id
    });

    if (existingReview) {
        req.flash("error", "You can add only one review for this destination.");
        return res.redirect(`/listings/${listing._id}`);
    }

    const newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    newReview.listing = listing._id;

    try {
        await newReview.save();
    } catch (err) {
        if (err && err.code === 11000) {
            req.flash("error", "You can add only one review for this destination.");
            return res.redirect(`/listings/${listing._id}`);
        }
        throw err;
    }

    await Listing.findByIdAndUpdate(req.params.id, {
        $push: { reviews: newReview._id }
    });

    req.flash("success", "New Review Created!");
    res.redirect(`/listings/${listing._id}`);
};

module.exports.destroyReview = async (req, res) => {
    let {id, reviewId} = req.params;
    await Listing.findByIdAndUpdate(id, {$pull: {reviews: reviewId}});
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Review Deleted!");
    res.redirect(`/listings/${id}`);
};