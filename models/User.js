const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    profilePicture: {
        type: String,
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
    },
    role: {
        type: String,
        required: true,
    },
    invitationToken: {
        type: String,
    },
    invitationExpires: {
        type: Date,
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
});

module.exports = mongoose.model('User', userSchema);
