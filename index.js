const express = require('express');
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const app = express();
const PORT = process.env.PORT || 3000;

const MONGO_URI = 'mongodb://localhost:27017/kt_4';
mongoose.connect(MONGO_URI)
    .then(() => console.log('Подключено к MongoDB'))
    .catch(err => {
        console.error('Ошибка подключения к MongoDB:', err);
        process.exit(1);
    });

const urlSchema = new mongoose.Schema({
    original: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (v) {
                return /^https?:\/\/.+/.test(v);
            },
            message: 'Неверный формат URL'
        }
    },
    short: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

const Url = mongoose.model('Url', urlSchema);

app.get('/', (req, res) => {
    res.send(`
    <p>Создать: <code>GET /create?url=https://example.com</code></p>
    <p>Перейти: <code>GET /ваш_короткий_код</code></p>
  `);
});

app.get('/create', async (req, res) => {
    const { url: originalUrl } = req.query;

    if (!originalUrl) {
        return res.status(400).json({ error: 'Параметр url обязателен' });
    }

    try {
        let urlDoc = await Url.findOne({ original: originalUrl });

        if (!urlDoc) {
            const short = nanoid(6);
            urlDoc = new Url({ original: originalUrl, short });
            await urlDoc.save();
        }

        const shortUrl = `${req.protocol}://${req.get('host')}/${urlDoc.short}`;
        res.json({ shortUrl });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(500).json({ error: 'Ошибка генерации ссылки. Попробуйте снова.' });
        }
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.get('/:short', async (req, res) => {
    const { short } = req.params;

    try {
        const urlDoc = await Url.findOne({ short });
        if (!urlDoc) {
            return res.status(404).send('Ссылка не найдена');
        }

        return res.redirect(urlDoc.original);
    } catch (err) {
        res.status(500).send('Ошибка сервера');
    }
});

app.listen(PORT, () => { console.log(`Сервер запущен http://localhost:${PORT}`) });