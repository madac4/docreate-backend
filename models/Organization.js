const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true,
    },
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    documents: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
        },
    ],
    invitations: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invitation',
        },
    ],
});

module.exports = mongoose.model('Organization', organizationSchema);
