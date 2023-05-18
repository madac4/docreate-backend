const CryptoJS = require('crypto-js');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const router = require('express').Router();

const User = require('../models/User.js');
const { verifyTokenAndAdmin, verifyToken } = require('../middleware/middleware');

const storage = multer.diskStorage({});

const upload = multer({
    storage,
    limits: { fileSize: 800000 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/jpg|jpeg|png$/)) {
            cb(new Error('File type is not supported'), false);
            return;
        }
        cb(null, true);
    },
});

cloudinary.config({
    cloud_name: 'dvzqsxwmu',
    api_key: '561418791592894',
    api_secret: 'WwEl1ZXc0LxHR1k25fLK1Di_7A8',
});

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

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Utilizatorul nu a fost găsit' });
        }
        if (name) {
            user.name = name;
        }
        if (email) {
            user.email = email;
        }
        if (password) {
            user.password = CryptoJS.AES.encrypt(password, process.env.PASSWORD_SECURE).toString();
        }

        await user.save();
        res.json(user);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Utilizatorul nu poate fi modificat' });
    }
});

router.put('/profile/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, currentPassword, newPassword, confirmPassword } = req.body;
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Utilizatorul nu a fost găsit' });
        }

        if (name) {
            user.name = name;
        }
        if (email) {
            user.email = email;
        }

        // Check if current password is correct
        if (currentPassword && user.checkPassword(currentPassword)) {
            return res.status(400).json({ error: 'Parola curentă este greșită' });
        }

        // Update password if new password is provided and matches confirm password
        if (newPassword && newPassword === confirmPassword) {
            user.password = await CryptoJS.AES.encrypt(
                newPassword,
                process.env.PASSWORD_SECURE,
            ).toString();
        } else {
            return res.status(400).json({ error: 'Parolele nu sunt identice' });
        }

        await user.save();
        res.json(user);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Utilizatorul nu poate fi modificat' });
    }
});

router.put(
    '/profile-picture/:id',
    upload.single('profilePicture'),
    verifyToken,
    async (req, res) => {
        try {
            const { id } = req.params;
            const result = await cloudinary.uploader.upload(req.file.path);
            const user = await User.findByIdAndUpdate(
                id,
                { profilePicture: result.secure_url },
                { new: true },
            );
            res.json(user);
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Failed to update profile picture' });
        }
    },
);

module.exports = router;
