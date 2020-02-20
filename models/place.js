let mongoose = require('mongoose');
let Schema = mongoose.Schema;


let PlaceSchema = new Schema({
    name: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    },
    coordinates: {
        type: String,
        required: true
    },
    county: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    approach: {
        type: String,
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    entrance: {
        type: String,
        required: true
    },
    technology: {
        type: String,
        required: true
    },
    owner: {
        type: String,
        required: true
    }
});

PlaceSchema.methods.convertToArray = function() {
    let array = [];

    array.push(this.name);
    array.push(this.coordinates);
    array.push(this.county);
    array.push(this.address);
    array.push(this.approach);
    array.push(this.contact);
    array.push(this.entrance);
    array.push(this.technology);
    array.push(this.owner);

    return array;
};

module.exports = mongoose.model('Place', PlaceSchema);