/*
 *  server.js
 *
 *  David Janes
 *  IOTDB.org
 *  2016-08-04
 *
 *  Copyright [2013-2016] [David P. Janes]
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

"use strict";

const express = require('express');
const body_parser = require("body-parser");
const unirest = require('unirest');

const app = express();
app.use(body_parser.json());
app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

// this is the source 
const iotdb = require("iotdb");
iotdb.use("homestar-wemo");

const iotdb_transport = require("../../iotdb-transport-iotdb/transporter");
const iotdb_transporter = iotdb_transport.make({}, iotdb.connect("WeMoSocket"));

// this is the actual transporter
const express_transport = require("../transporter")
const express_transporter = express_transport.make({
    prefix: "/things",
}, iotdb_transporter, app)
