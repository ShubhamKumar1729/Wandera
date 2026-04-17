const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    comment: String,
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true
    }
});

// Ensure a user can only leave one review per listing.
reviewSchema.index({ listing: 1, author: 1 }, { unique: true });

module.exports = mongoose.model("Review",reviewSchema);
