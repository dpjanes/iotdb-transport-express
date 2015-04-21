/*
 *  web.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-04-17
 *
 *  Demonstrate receiving
 *  Make sure to see README first
 */

var iotdb = require('iotdb');
var express = require('express');
var ExpressTransport = require('../ExpressTransport').ExpressTransport;
var IOTDBTransport = require("iotdb-transport-iotdb").Transport;

var iot = iotdb.iot();
var things = iot.connect();

var iotdb_transport = new IOTDBTransport(things);

var app = express();

var express_transport = new ExpressTransport({
    prefix: "/api",
}, app);
iotdb.transporter.bind(iotdb_transport, express_transport, {
});

app.listen(8085, "127.0.0.1", function () {
    console.log("+", "running", "127.0.0.1:8085");
});
