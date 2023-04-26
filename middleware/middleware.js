const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

const verifyToken = async (req, res, next) => {
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

const verifyTokenAndAdmin = async (req, res, next) => {
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
        const isAdmin = await User.findById(req.user.id).select('-password');
        if (isAdmin.role.toLowerCase() === 'admin') {
            next();
        } else {
            return res
                .status(401)
                .json({ msg: 'Nu sunteti autorizat sa accesati aceasta resursa' });
        }
    } catch (error) {
        res.status(401).json({ msg: 'Tokenul nu este valid' });
    }
};

module.exports = { verifyToken, verifyTokenAndAdmin };
