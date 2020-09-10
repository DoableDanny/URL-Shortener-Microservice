const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const { response } = require('express');

const app = express();
dotenv.config();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Connect to database
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

// Define Schema
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  originalUrl: { type: String, required: true },
  shortUrl: Number,
});

// Create model
const Url = mongoose.model('Url', urlSchema);

let responseObject = {};

// bodyParser populates req.body with an object with "name='url'" and the user input value (see html text input)
app.post(
  '/api/shorturl/new',
  bodyParser.urlencoded({ extended: false }),
  (req, res) => {
    let inputUrl = req.body['url'];

    let urlRegex = new RegExp(
      /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi
    );

    if (!inputUrl.match(urlRegex)) {
      res.json({ error: 'Invalid URL' });
      return;
    }

    responseObject['original_url'] = inputUrl;

    let inputShort = 1;

    Url.findOne({})
      .sort({ shortUrl: 'desc' })
      .exec((err, result) => {
        if (err) console.log(err);
        else if (!err && result != undefined) {
          inputShort = result.shortUrl + 1;
        }
        if (!err) {
          Url.findOneAndUpdate(
            { originalUrl: inputUrl },
            { originalUrl: inputUrl, shortUrl: inputShort },
            { new: true, upsert: true },
            (err, savedUrl) => {
              if (err) console.log(err);
              else {
                responseObject['short_url'] = savedUrl.shortUrl;
                res.json(responseObject);
              }
            }
          );
        }
      });
  }
);

// Redirect user to original Url
app.get('/api/shorturl/:input', (req, res) => {
  let input = req.params['input'];

  Url.findOne({ shortUrl: input }, (err, result) => {
    if (err) console.log(err);
    else if (!err && result != undefined) {
      res.redirect(result.originalUrl);
    } else {
      response.send('URL not found :(');
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
