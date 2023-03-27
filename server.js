/**
 Author: Rustambek Sobithanov
 This script defines a Node.js web server that connects to a MongoDB Atlas cluster
 and serves an API that allows users to perform CRUD (Create, Read, Update, Delete) operations
 on items and users. The API allows users to add and search for items, as well as retrieve listings
 and purchase history for specific users. The server also serves a static HTML file for the home page.
 */

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Use body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

mongoose.connect('mongodb+srv://sobitxanovr:2ik19goHn21Ej0RL@ostaa.jf7rett.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected...'))
    .catch((err) => console.log(err));

app.use(express.static('public_html'));


const itemSchema = new mongoose.Schema({
    title: String,
    description: String,
    image: String,
    price: Number,
    stat: String
});

const Item = mongoose.model('Item', itemSchema);

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    listings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
    purchases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }]
});

const User = mongoose.model('User', userSchema);


app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/public_html/index.html`);
});

app.get('/get/users/', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/get/items/', async (req, res) => {
    try {
        const items = await Item.find();
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


// Add a user to the database
app.post('/add/user', (req, res) => {
    const { username, password } = req.body;

    const newUser = new User({
        username,
        password,
        listings: [],
        purchases: []
    });

    newUser.save()
        .then(user => {
            console.log('New user added:');
            res.status(200).send('User added successfully');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error adding user');
        });
});

// Add an item to a user's listings
app.post('/add/item', (req, res) => {
    const { title, description, image, price, stat, username } = req.body;
    console.log(username);

    User.findOne({ username })
        .then(user => {
            if (!user) {
                console.log(username);
                return res.status(500).json({ error: 'User: not found' });
            }

            const item = new Item({ title, description, image, price, stat });
            return item.save().then(item => {
                user.listings.push(item._id);
                user.save();
                console.log(user);
                return;
            }).then(() => {
                console.log(`New item added to ${user.username}'s listings: ${item.title}`);
                return res.status(200).json({ message: 'Item added successfully' });
            });
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: 'Failed to add item to user' });
        });
});


app.get('/search/users/:keyword', (req, res) => {
    const { keyword } = req.params;

    User.find({ username: { $regex: keyword, $options: 'i' } })
        .then(users => {
            if (!users) {
                return res.status(404).json({ error: 'No users found' });
            }
            return res.status(200).json(users);
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: 'Failed to search for users' });
        });
});


app.get('/search/items/:keyword', async (req, res) => {
    const { keyword } = req.params;
    const regex = new RegExp(keyword, 'i');

    try {
        const items = await Item.find({ description: regex }).exec();
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.get('/get/listings/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const user = await User.findOne({ username }).populate('listings');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const listings = user.listings;
        return res.status(200).json(listings);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to retrieve user listings' });
    }
});


// Get all purchases for a user
app.get('/get/purchases/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const user = await User.findOne({ username }).populate('purchases').exec();
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const purchases = user.purchases;
        res.json(purchases);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.listen(3000, () => {
    console.log('Server is listening on port 3000...');
});
