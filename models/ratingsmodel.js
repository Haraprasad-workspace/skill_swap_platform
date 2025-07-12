const mongoose = require('../config/mongodb-config');

const ratingSchema = mongoose.Schema({
    swapRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SwapRequest',
        required: true
    },
    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    toUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    feedback: {
        type: String,
        default: ""
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Rating", ratingSchema);
