const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const authJwtController = require('./auth_jwt'); // You're not using authController, consider removing it
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./Users');
const Movie = require('./Movies'); // You're not using Movie, consider removing it

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

const router = express.Router();

router.post('/signup', async function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        try {
            await user.save();
            res.json({success: true, msg: 'Successfully created new user.'})
        } catch (err) {
            if (err.code == 11000)
                return res.json({ success: false, message: 'A user with that username already exists.'});
            else
                return res.json(err);
        }
    }
});

router.all('/signup', (req, res) => {
    // Returns a message stating that the HTTP method is unsupported.
    res.status(405).send({ message: 'HTTP method not supported.' });
});

router.post('/signin', async function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    try {
        const user = await User.findOne({ username: userNew.username }).select('name username password').exec();
        
        if (!user) {
            return res.status(401).send({success: false, msg: 'Authentication failed.'});
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    } catch (err) {
        res.send(err);
    }
});

router.all('/signin', (req, res) => {
    // Returns a message stating that the HTTP method is unsupported.
    res.status(405).send({ message: 'HTTP method not supported.' });
});

router.route('/movies/:title')
    .get(authJwtController.isAuthenticated, async function (req, res) {
        try {
            const data = await Movie.findOne({title: req.params.title});
            if (!data) {
                res.json({status: 400, message: "Movie ''" + req.params.title + "'' couldn't be found."})
            }
            else {
                res.json({status: 200, message: "" + req.params.title + " was found!", movie: data});
            }
        } catch (err) {
            res.json({status: 400, message: "Movie ''" + req.params.title + "'' couldn't be found."})
        }
    })

    .post(authJwtController.isAuthenticated, (req, res) => {
        res.json({status: 400, message: "Invalid action."})
    })

    .put(authJwtController.isAuthenticated, async function(req, res) {
        try {
            const doc = await Movie.findOneAndUpdate(
                {title: req.params.title}, { 
                    title: req.body.title,
                    releaseDate: req.body.releaseDate,
                    genre: req.body.genre,
                    actors: req.body.actors 
                },
                { new: true }
            );

            if (!doc) {
                res.json({ message: "Movie not found." });
            }
            else {
                res.json({ status: 200, message: "" + req.body.title + " UPDATED"});
            }
        } catch (err) {
            res.json({ message: "Movie could not be updated." });
        }
    })

    .delete(authJwtController.isAuthenticated, async function(req, res) {
        try {
            const data = await Movie.findOneAndDelete({title: req.params.title});
            if (!data) {
                res.json({message: "There was an issue trying to find your movie"})
            }
            else {
                res.json({message: "" + req.params.title + " DELETED"});
            }
        } catch (err) {
            res.json(err);
        }
    })
    
    .all((req, res) => {
        // Any other HTTP Method
        // Returns a message stating that the HTTP method is unsupported.
        res.status(405).send({ message: 'HTTP method not supported.' });
    }
);

router.route('/movies')
    .get(authJwtController.isAuthenticated, async function (req, res) {
        try {
            const data = await Movie.find({}, 'title');
            if (!data || data.length == 0) {
                res.json({status: 400, message: "No movies found."})
            }
            else {
                const movieTitles = data.map(movie => movie.title);
                res.json({status: 200, message: "Movies found!", titles: movieTitles});
            }
        } catch (err) {
            res.json({status: 400, message: "No movies found."});
        }
    })
    
    .post(authJwtController.isAuthenticated, async function(req, res) {
        try {
            try {
                await Movie.findOne({title: req.body.title});
            } catch (err) {
                return res.status(400);
            }

            if (!req.body.actors || req.body.actors.length < 3) {
                return res.json({message: "Not enough actors. (You need at least 3)"});
            }
            
            var newMovie = new Movie();
            newMovie.title = req.body.title;
            newMovie.releaseDate = req.body.releaseDate;
            newMovie.genre = req.body.genre;
            newMovie.actors = req.body.actors;
            
            await newMovie.save();
            res.json({status: 200, success: true, message: "" + req.body.title + " SAVED"});
            
        } catch (err) {
            res.json({message: err});
        }
    })

    .put(authJwtController.isAuthenticated, (req, res) => {
        res.json({status: 400, message: "Invalid action."})
    })

    .delete(authJwtController.isAuthenticated, (req, res) => {
        res.json({status: 400, message: "Invalid action."})
    })

    .all((req, res) => {
        // Any other HTTP Method
        // Returns a message stating that the HTTP method is unsupported.
        res.status(405).send({ message: 'HTTP method not supported.' });
    })

app.use('/', router);

const PORT = process.env.PORT || 8080; // Define PORT before using it
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // for testing only
