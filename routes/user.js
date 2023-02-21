const router = require('express').Router();

const User = require('../models/User.js');
const { verifyToken } = require('../middleware/middleware');

router.delete('/delete/:id', verifyToken, async (req, res) => {
    const user = await User.findById(req.user.id).select('-password');
    if (user && user.role.toLowerCase() === 'admin') {
        User.findByIdAndDelete(req.params.id, (error) => {
            if (error) {
                res.status(400).send(error);
            } else {
                res.send({ message: 'User deleted successfully' });
            }
        });
    }
});

router.get('/getUsers', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (user && user.role.toLowerCase() === 'admin') {
            const users = await User.find();
            res.status(200).json(users);
        }
    } catch (error) {
        console.log(error);
    }
});

module.exports = router;
