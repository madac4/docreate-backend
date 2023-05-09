const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
    expires: {
        type: Date,
        required: true,
    },
});

module.exports = mongoose.model('Invitation', invitationSchema);
