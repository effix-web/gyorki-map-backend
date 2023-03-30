let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let fileUpload = require('express-fileupload');
let logger = require('morgan');
let cors = require('cors');
let xlsx = require('node-xlsx').default;

let xlsParser = require('xls-parser');
let fs = require('fs');

let Excel = require('exceljs');

let message = require('./utils/message'); //Wrapper for {messageUtil: 'something'}

let mongoose = require('./db/mongoose');

let User = require('./models/user');
let Place = require('./models/place');

let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(fileUpload({
    createParentPath: true,
    preserveExtension: true
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "https://adatbazis.gyorki.hu/"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });


app.post('/login', (req, res) => {
    let loginUser = new User({
        username: req.body.username,
        password: req.body.password,
        isAdmin: !!(req.body.isAdmin)
    });
    console.log(loginUser.username, loginUser.password);


    User.findOne({username: loginUser.username}, function (err, user) {
        if (user) {
            if (err) {
                return res.status(400).send(message("Incorrect username/password"));
            }

            user.comparePassword(loginUser.password, function (err, isMatch) {
                if (err) return res.status(400).send(message("Incorrect username/password"));

                if (isMatch) {
                    return res.send({
                        type: "login",
                        payload: {
                            username: user.username,
                            isAdmin: user.isAdmin
                        }
                    });
                } else {
                    return res.status(400).send(message("Incorrect username/password"));
                }
            });
        } else {
            return res.status(400).send(message("Incorrect username/password"));
        }

    });

});

app.post('/register', (req, res) => {
    let user = new User({
        username: req.body.username,
        password: req.body.password,
        isAdmin: req.body.isAdmin
    });
    //console.log(req.body.username, req.body.password);

    User.findOne({username: user.username}).then((doc) => {

        if (doc) {
            return res.status(400).send(message('User exists'));
        } else {
            user.save().then((doc) => {
                res.send({
                    type: 'register',
                    payload: true
                });
            }, (e) => {
                res.status(400).send(message('Couldn\'t save user'));
            });
        }
    }, (e) => {
        console.log(e);
        res.status(400).send(message(e));
    });
});

app.post('/upload', (req, res) => {
    //console.log(req.files.file);
    let file = req.files.file;

    Place.collection.drop();

    file.mv('./xls/upload/' + file.name, function (err) {
        if (err) {
            return res.status(500).send(err);
        }
        let parsedFile = xlsx.parse('./xls/upload/' + file.name)[0];

        for (let i = 0; i < parsedFile.data.length; i++) {
            let place = new Place();
            let data = parsedFile.data[i];
            console.log(data[4].toLowerCase());
            place.name = data[0];
            place.coordinates = data[1];
            place.county = data[2];
            place.address = data[3];
            place.tetra = (data[4].toLowerCase() === 'igen');
            place.gazirtas =  (data[5].toLowerCase() === 'igen');
            place.approach = data[6];
            place.contact = data[7];
            place.entrance = data[8];
            place.technology = data[9];
            place.owner = data[10];

            place.save().then((doc) => {
                //console.log(doc);
                res.send({
                    type: 'place',
                    payload: true
                });
            }, (e) => {
                console.log(e);
                res.status(400).send(message('Couldn\'t save place'));
            });
            /*parsedFile.data[i].forEach((col) => {
                console.log(col);
            });*/

        }


        res.send(message('File uploaded'));
    });
});

app.get('/places', (req, res) => {
    console.log('places');
    Place.find().sort('name').then((doc) => {
        console.log(doc);
        res.send(doc);
    }, (e) => {
        console.log(e);
        res.status(400).send(message(e));
    });
});

app.post('/place', (req, res) => {
    console.log(req.body);
    let newPlace = new Place();

    newPlace.name = req.body.name;
    newPlace.coordinates = req.body.coordinates;
    newPlace.county = req.body.county;
    newPlace.address = req.body.address;
    newPlace.tetra = req.body.tetra;
    newPlace.gazirtas = req.body.gazirtas;
    newPlace.approach = req.body.approach;
    newPlace.contact = req.body.contact;
    newPlace.entrance = req.body.entrance;
    newPlace.technology = req.body.technology;
    newPlace.owner = req.body.owner;

    newPlace.save().then((doc) => {
        if(doc) res.send(message('Place successfully added'));
    }, (err) => {
       console.log(err);
    });

});

app.delete('/place', (req, res) => {
    console.log(req.body.id);
    Place.deleteOne({_id: req.body.id}, function(err, response){
       if(err) res.status(400).send(message('Cannot delete place'));

       res.send(req.body.id);
    });



    Place.find({_id: req.params.id}).then((doc) => {
        if(doc) doc.deleteOne();
        res.send(message(req.params.id));
    }, (e) => {
        res.status(400).send(message("Can't delete place"));
    });
});

app.get('/download', (req, res) => {
    Place.find().sort('name').then((doc) => {
        //Sending the raw data back to be created on the client side, I know, don't judge me
        if (doc) res.send(doc);
    }, (e) => {
        res.status(400).send(message(e));
    });
});


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});


app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});


module.exports = app;
