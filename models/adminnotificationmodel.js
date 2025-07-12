const mongoose = require('../config/mongodb-config');

const adminNotificationSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'warning', 'success', 'error'],
        default: 'info'
    },
    targetUsers: {
        type: String,
        enum: ['all', 'banned', 'active', 'specific'],
        default: 'all'
    },
    specificUserIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model("AdminNotification", adminNotificationSchema); 