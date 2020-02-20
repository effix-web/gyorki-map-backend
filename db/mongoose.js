let mongoose = require('mongoose');

mongoose.Promise = require('promise');
mongoose.connect(
    'mongodb+srv://gyorki_admin:BXYwATiBZ3YcIoStBlsE@gyorki-database-znqev.azure.mongodb.net/gyorki-db?retryWrites=true&w=majority', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
);

let db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

module.exports = {mongoose};