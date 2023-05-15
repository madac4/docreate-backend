const mongoose = require('mongoose');

const ActiveSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    deviceId: {
        type: String,
        required: true,
    },
    browser: {
        type: String,
    },
    os: {
        type: String,
    },
    ip: {
        type: String,
    },
    city: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

ActiveSessionSchema.statics.removeSession = async function (sessionId) {
    try {
        await this.deleteOne({ sessionId });
        console.log(`Session ${sessionId} removed`);
    } catch (err) {
        console.error(`Error removing session ${sessionId}: ${err}`);
    }
};

module.exports = mongoose.model('ActiveSession', ActiveSessionSchema);
