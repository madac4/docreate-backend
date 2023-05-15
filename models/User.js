const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

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

userSchema.methods.checkPassword = function (password) {
    const decryptedPassword = CryptoJS.AES.decrypt(
        this.password,
        process.env.PASSWORD_SECURE,
    ).toString(CryptoJS.enc.Utf8);

    return decryptedPassword !== password;
};

module.exports = mongoose.model('User', userSchema);
