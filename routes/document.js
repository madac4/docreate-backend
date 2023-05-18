const multer = require('multer');
const slugify = require('slugify');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');

const router = require('express').Router();
const upload = multer({ storage: multer.memoryStorage() });

const { verifyToken, verifyTokenAndAdmin } = require('../middleware/middleware');
const Document = require('../models/Document.js');

router.post('/', upload.single('file'), verifyTokenAndAdmin, async (req, res) => {
    const file = req.file;
    const inputs = JSON.parse(req.body.inputs);

    try {
        const document = new Document({
            name: req.body.name,
            file: {
                data: file.buffer,
                contentType: file.mimetype,
            },
            inputs: inputs,
            organization: req.user.organization,
        });

        await document.save();

        const organization = await Organization.findOneAndUpdate(
            { admin: req.user.id },
            { $push: { documents: document._id } },
            { new: true },
        );

        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

router.put('/update/:id', upload.single('file'), verifyTokenAndAdmin, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const file = req.file;
    const updateObject = {};

    if (name) {
        updateObject.name = name;
        updateObject.slug = slugify(name, { lower: true });
    }
    if (file) {
        updateObject.file = {
            data: file.buffer,
            contentType: file.mimetype,
        };
    }
    try {
        const newDocument = await Document.findByIdAndUpdate(id, updateObject, { new: true });
        res.json(newDocument);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Fișierul nu poate fi modificat' });
    }
});

router.delete('/delete/:id', verifyTokenAndAdmin, async (req, res) => {
    Document.findByIdAndDelete(req.params.id, (error) => {
        if (error) {
            res.status(400).send(error);
        } else {
            res.send({ message: 'Document deleted successfully' });
        }
    });
});

router.get('/', verifyToken, async (req, res) => {
    try {
        const organizationId = req.user.organization;
        const documents = await Document.find({ organization: organizationId }).select('-file');
        res.json(documents);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

router.get('/getfile/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        const documentData = req.query;
        const document = await Document.findById(id);
        if (!document) {
            return res.status(404).json({ message: 'Documentul nu a fost găsit' });
        }
        const buffer = document.file.data;
        const type = document.file.contentType.toString('utf-8');
        res.setHeader('Content-Type', type);
        res.setHeader('Content-Disposition', 'inline; filename=' + document.slug);

        const zip = new PizZip(buffer);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        doc.render(documentData);
        // doc.render({
        //     project: 'Ministerul Economiei (MDED)',
        //     offer: [
        //         {
        //             livrabil: 'Creare Web-Design',
        //             price: '450',
        //             quantity: '1',
        //             unity_price: '450',
        //         },
        //         {
        //             livrabil: 'Crearea părții Front-End (Partea vizuală)',
        //             price: '600',
        //             quantity: '1',
        //             unity_price: '600',
        //         },
        //         {
        //             livrabil:
        //                 'Adaptarea vizualului pentru toate tipurile de device-uri și pentru majoritatea browser-urilor + testarea',
        //             price: '200',
        //             quantity: '1',
        //             unity_price: '200',
        //         },
        //         {
        //             livrabil: 'Securizarea Admin Dashboard-ului',
        //             price: '250',
        //             quantity: '1',
        //             unity_price: '250',
        //         },
        //         {
        //             livrabil: 'Testarea si Publicarea site-ului',
        //             price: '250',
        //             quantity: '1',
        //             unity_price: '250',
        //         },
        //     ],
        //     company_fee: '250',
        //     total_price: '2000',
        // });

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        res.send(buf);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

router.get('/:slug', verifyToken, async (req, res) => {
    try {
        const document = await Document.findOne({ slug: req.params.slug }).select('-file');
        if (!document) {
            return res.status(404).json({ message: 'Documentul nu a fost găsit' });
        }
        res.json(document);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

module.exports = router;
