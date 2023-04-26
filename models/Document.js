const mongoose = require('mongoose');
const slugify = require('slugify');

const documentSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: {
        type: String,
        unique: true,
    },
    file: {
        data: Buffer,
        contentType: Buffer,
    },
    inputs: {
        type: Array,
        required: true,
    },
});

documentSchema.pre('save', async function (next) {
    if (!this.isModified('name')) {
        return next();
    }

    this.slug = slugify(this.name, { lower: true });

    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
    const documentWithSlug = await this.constructor.findOne({ slug: slugRegEx });
    if (documentWithSlug) {
        this.slug = `${this.slug}-${documentWithSlug.count}`;
        documentWithSlug.count += 1;
        await documentWithSlug.save();
    }
    next();
});

module.exports = mongoose.model('Document', documentSchema);
