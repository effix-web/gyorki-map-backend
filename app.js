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

        for (let i = 1; i < parsedFile.data.length; i++) {
            let place = new Place();
            let data = parsedFile.data[i];
            place.name = data[0];
            place.coordinates = data[1];
            place.county = data[4];
            place.address = data[5];
            place.approach = data[6];
            place.contact = data[7];
            place.entrance = data[8];
            place.technology = data[9];
            place.owner = data[10];

            place.save().then((doc) => {
                res.send({
                    type: 'place',
                    payload: true
                });
            }, (e) => {
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
        //console.log(array);
        res.send(doc);
    }, (e) => {
        console.log(e);
        res.status(400).send(message(e));
    });
});

app.get('/download', (req, res) => {
    Place.find().sort('name').then((doc) => {
        //console.log(doc);
        //let data = [];
        let workbook = new Excel.Workbook();
        workbook.created = new Date();

        let worksheet = workbook.addWorksheet('Adatok');


        doc.forEach((row) => {
            worksheet.addRow(row.convertToArray());
            //data.push(row.convertToArray());
        });

        //worksheet.addRow(['test', 'test20']);

        /*console.log(workbook);
        res.send(JSON.stringify(workbook));*/

        workbook.xlsx.writeFile(`${__dirname}/xls/download/gyorki_database.xlsx`)
            .then(() => {
                res.setHeader('Content-disposition', 'attachment; filename=gyorki_database.xlsx');
                res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.sendFile(`${__dirname}/xls/download/gyorki_database.xlsx`, '',
                    function(err){
                        if(err) console.log(err);
                        
                        console.log('success');
                    });
            })
            .catch((e) => {
                console.log(e);
            });





        //const dataSheet1 = [[1, 2, 3], [true, false, null, 'sheetjs'], ['foo', 'bar', new Date('2014-02-19T14:30Z'), '0.3'], ['baz', null, 'qux']];
        //let buffer = xlsx.build([{name: "Adatok", data: data}]);


        /*fs.writeFile('./xls/download/gyorki_database.xlsx', buffer, function (err) {
            if (err) {
                console.log(err);
            }
            let file = `./xls/download/gyorki_database.xlsx`;
            let base64file = Buffer.from(buffer).toString('base64');
            //res.download(base64file);
            console.log(base64file);
            res.write(base64file);
            res.end();
        });*/
        //res.send(new Buffer(buffer));

    }, (e) => {
        res.status(400).send(message(e));
    });
});


// catch 404 and forward to error handler
/*app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});*/


module.exports = app;
