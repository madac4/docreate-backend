const { body } = require('express-validator');

const registerValidation = [
    body('email', 'Introduceți un email valid').isEmail(),
    body('password', 'Parola trebuie să conțină minim 6 caractere').isLength({ min: 6 }),
    body('name', 'Numele și Penumele este prea scurt').isLength({ min: 3 }),
];

const loginValidation = [
    body('email', 'Introduceți un email valid').isEmail(),
    body('password', 'Parola trebuie să conțină minim 6 caractere').isLength({ min: 6 }),
];

const mailValidation = [body('email', 'Introduceți un email valid').isEmail()];
const passwordValidation = [
    body('password', 'Parola trebuie să conțină minim 6 caractere').isLength({ min: 6 }),
];

module.exports = {
    registerValidation,
    loginValidation,
    mailValidation,
    passwordValidation,
};
