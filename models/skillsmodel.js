const mongoose = require('../config/mongodb-config');

const skillSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    skillName: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['offered', 'wanted'],
        required: true
    }
});

module.exports = mongoose.model("Skill", skillSchema);
