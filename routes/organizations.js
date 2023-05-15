const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const { verifyToken } = require('../middleware/middleware');

router.get('/:id', verifyToken, async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id);
        res.json(organization.name);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
