const mongoose = require('../config/mongodb-config');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        default: null
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    location: {
        type: String,
        default: null
    },
    profilePhoto: {
        type: String, // store file path or URL
        default: null
    },
    availability: {
        type: String,
        default: null // e.g. "Weekends"
    },
    skillsOffered: [{
        type: String,
        default: []
    }],
    skillsWanted: [{
        type: String,
        default: []
    }],
    isPrivate: {
        type: Boolean,
        default: false
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    banReason: {
        type: String,
        default: null
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    loginCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("User", userSchema);
