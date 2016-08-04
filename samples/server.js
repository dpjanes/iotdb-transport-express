const express = require('express');
const app = express();

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

// this is the source 
const iotdb = require("iotdb");
iotdb.use("homestar-wemo");

iotdb_transporter = require("../../iotdb-transport-iotdb/transporter");
iotdb_transport = iotdb_transporter.make({}, iotdb.connect("WeMoSocket"));

// this is the actual transporter
express_transporter = require("../transporter")
express_transport = express_transporter.make({}, app)

// the actual gets data from the source
express_transport.use(iotdb_transport)
