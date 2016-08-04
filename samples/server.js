const express = require('express');
const app = express();

/*
app.get('/', function (req, res) {
  res.send('Hello World!');
});
*/

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

const iotdb = require("iotdb");
iotdb.use("homestar-wemo");

iotdb_transporter = require("../iotdb-transport-iotdb/transporter");
iotdb_transport = iotdb_transporter.make({}, iotdb.connect("WeMoSocket"));

express_transporter = require("./transporter")
express_transport = express_transporter.make({}, app)

express_transport.source.list(iotdb_transport)
express_transport.source.bands(iotdb_transport)
express_transport.source.get(iotdb_transport)
// express_transport.source.pu(iotdb_transport)
