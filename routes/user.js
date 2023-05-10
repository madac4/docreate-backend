const CryptoJS = require('crypto-js');
const router = require('express').Router();

const User = require('../models/User.js');
const { verifyTokenAndAdmin } = require('../middleware/middleware');

router.delete('/delete/:id', verifyTokenAndAdmin, async (req, res) => {
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

router.get('/get', verifyTokenAndAdmin, async (req, res) => {
    try {
        const users = await User.find({ organization: req.user.organization }).select('-password');
        res.status(200).json(users);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

router.put('/update/:id', verifyTokenAndAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, password } = req.body;
    const updateObject = {};
    if (name) {
        updateObject.name = name;
    }
    if (email) {
        updateObject.email = email;
    }
    if (password) {
        updateObject.password = CryptoJS.AES.encrypt(
            password,
            process.env.PASSWORD_SECURE,
        ).toString();
    }
    try {
        const newUser = await User.findByIdAndUpdate(id, updateObject, { new: true });
        res.json(newUser);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Utilizatorul nu poate fi modificat' });
    }
});

module.exports = router;
