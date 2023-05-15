const router = require('express').Router();
const { verifyToken } = require('../middleware/middleware');
const ActiveSession = require('../models/Session');

router.get('/', verifyToken, async (req, res) => {
    try {
        const activeSessions = await ActiveSession.find({ userId: req.user.id });
        res.json(activeSessions);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

router.delete('/:sessionId', verifyToken, async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const session = await ActiveSession.findByIdAndDelete(sessionId);

        if (!session) {
            return res.status(404).send({ message: 'Session not found' });
        }

        res.send({ message: 'Session deleted successfully' });
    } catch (err) {
        console.error(`Error deleting session ${sessionId}: ${err}`);
        res.status(500).send({ message: 'Internal server error' });
    }
});
module.exports = router;
