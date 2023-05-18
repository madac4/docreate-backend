const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const CryptoJS = require('crypto-js');
const gravatar = require('gravatar');
const jwt = require('jsonwebtoken');

const User = require('../models/User.js');

const senderEmail = 'contact@stellarsolutions.md';
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'orbupetru12@gmail.com',
        pass: 'jzraqoqnwvqngdwl',
    },
});

const inviteUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email } = req.body;
        let user = await User.findOne({ email: email });
        if (user) {
            return res.status(400).json({
                errors: [{ msg: 'Acest utilizator deja exista' }],
            });
        }

        const token = jwt.sign(
            { email, organization: req.user.organization },
            process.env.JWT_SECRET,
            {
                expiresIn: '30m',
            },
        );

        // const inviteLink = `http://localhost:3000/register/${token}`;
        const inviteLink = `https://docreate.vercel.app/register/${token}`;
        const mailOptions = {
            from: `DoCreate ${senderEmail}`,
            to: email,
            subject: 'You have been invited to join our organization',
            html: `Please follow this link to create your account: <a href="${inviteLink}">Click Here</a>`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Invitația a fost trimisă' });
    } catch (error) {
        res.status(400).json({ message: 'Invitația nu a putut fi trimisa' });
    }
};

const getEmailFromToken = async (req, res) => {
    const token = req.header('x-auth-token');
    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        res.send(decodedToken.email);
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    const token = req.header('x-auth-token');

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const avatar = gravatar.url(email, { s: '200', r: 'pg', d: 'mm' });

        const encryptedPassword = CryptoJS.AES.encrypt(
            password,
            process.env.PASSWORD_SECURE,
        ).toString();

        await User.create({
            name,
            email,
            password: encryptedPassword,
            organization: decodedToken.organization,
            profilePicture: avatar,
            role: 'Member',
        });

        res.status(200).json({ message: 'Contul a fost creat cu succes' });
    } catch (error) {
        res.status(400).json({ message: 'Contul nu a putut fi creat' });
    }
};

const loginUser = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.status(400).json({ errors: [{ msg: 'Email sau Parola este greșită' }] });
        }

        const decryptedPassword = CryptoJS.AES.decrypt(
            user.password,
            process.env.PASSWORD_SECURE,
        ).toString(CryptoJS.enc.Utf8);

        if (decryptedPassword !== req.body.password) {
            return res.status(401).send({ message: 'Email sau Parola este greșită' });
        }

        const payload = {
            user: {
                id: user.id,
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            {
                expiresIn: req.body.remember ? '14d' : '12h',
            },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            },
        );
    } catch (error) {
        res.status(400).send(error);
    }
};

const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

const forgetPassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ error: 'Utilizatorul nu a fost găsit' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        // const resetLink = `http://localhost:3000/reset-password/${token}`;
        const resetLink = `https://docreate.vercel.app/reset-password/${token}`;

        const mailOptions = {
            from: `DoCreate ${senderEmail}`,
            to: email,
            subject: 'Reset Password',
            html: `You are receiving this email because you (or someone else) has requested a password reset for your account.<br/><br/>
                  Please click on the following link, or paste it into your browser to complete the process: <br/><br/>
                  <a href="${resetLink}">Resetează parola</a> <br/><br/>
                  If you did not request this, please ignore this email and your password will remain unchanged.<br/>`,
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Verificati email pentru a reseta parola' });
    } catch (error) {
        res.status(500).json({ message: 'Email-ul nu a putut fi trimis' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { password } = req.body;
        const { token } = req.params;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(404).json({ error: 'Invalid or expired token' });
        }

        user.password = CryptoJS.AES.encrypt(
            password.newPassword,
            process.env.PASSWORD_SECURE,
        ).toString();
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.json({ message: 'Parola a fost resetată' });
    } catch (error) {
        res.status(500).json({ message: 'Parola nu a putut fi resetată' });
    }
};

module.exports = {
    inviteUser,
    getEmailFromToken,
    registerUser,
    loginUser,
    getUser,
    forgetPassword,
    resetPassword,
};
