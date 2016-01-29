/*
 *  receive.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-03-27
 *
 *  Demonstrate receiving
 *  Make sure to see README first
 */

var Transport = require('../ExpressTransport').ExpressTransport;

var p = new Transport({
});
BROKEN
p.get("MyThingID", "meta", function(id, band, value) {
    if (error) {
        console.log("#", error);
        return;
    }
    console.log("+", "get", id, band, value);
});
p.updated(function(error, ud) {
    if (error) {
        console.log("#", error);
        return;
    }

    if (value === undefined) {
        p.get(id, band, function(_id, _band, value) {
            if (error) {
                console.log("#", error);
                return;
            }
            console.log("+", id, band, value);
        });
    } else {
        console.log("+", id, band, value);
    }
});
