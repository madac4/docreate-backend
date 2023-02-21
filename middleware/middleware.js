const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'Nu exista un token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp < currentTime) {
            return res.status(401).json({ msg: 'Tokenul a expirat' });
        }
        req.user = decoded.user;
        next();
    } catch (error) {
        res.status(401).json({ msg: 'Tokenul nu este valid' });
    }
};

module.exports = { verifyToken };
