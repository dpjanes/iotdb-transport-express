/*
 *  server_put.js
 *
 *  David Janes
 *  IOTDB.org
 *  2016-08-13
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

const iotdb_transport_iotdb = require("../../iotdb-transport-iotdb/transporter");
const iotdb_transport_express = require("../transporter")

const app = express();
app.use(body_parser.json());
app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

// this is the source 
const iotdb = require("iotdb");
iotdb.use("homestar-wemo");

const things = iotdb.connect("WeMoSocket");

const iotdb_transporter = iotdb_transport_iotdb.make({}, things);

// this is the actual transporter
const express_transporter = iotdb_transport_express.make({
    prefix: "/things",
}, iotdb_transporter, app)

// The clever bit - when one is added, test the put using Unirest
iotdb_transporter
    .added()
    .subscribe(
        ad => {
            console.log("-", "thing added");

            let count = 0;
            setInterval(() => {
                unirest
                    .put("http://127.0.0.1:3000/things/" + ad.id + "/ostate")
                    .type('json')
                    .json({
                        "on": count++ % 2,
                    })
                    .end((result) => {
                        if (result.error) {
                            console.log("#", "unirest.put", result.error);
                        } else {
                            console.log("+", "unirest.put", result.body);
                        }
                    });
            }, 1500);
        }
    );

