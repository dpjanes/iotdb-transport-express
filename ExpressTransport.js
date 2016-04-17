/*
 *  ExpressTransport.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-03-27
 *
 *  Copyright [2013-2015] [David P. Janes]
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

var iotdb = require('iotdb');
var iotdb_transport = require('iotdb-transport');
var errors = iotdb_transport.errors;
var _ = iotdb._;

var path = require('path');

var events = require('events');
var util = require('util');
var url = require('url');

var logger = iotdb.logger({
    name: 'iotdb-transport-express',
    module: 'ExpressTransport',
});

/* --- forward definitions --- */
var _encode;
var _decode;
var _unpack;
var _pack;

/* --- constructor --- */

/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 *  <p>
 *  Create a web interface for Express.
 *
 *  @param {dictionary} initd
 *
 *  @param {object} app
 *  An ExpressJS app
 */
var ExpressTransport = function (initd, app) {
    var self = this;

    self.initd = _.defaults(
        initd, {
            channel: iotdb_transport.channel,
            unchannel: iotdb_transport.unchannel,
            encode: _encode,
            decode: _decode,
            pack: _pack,
            unpack: _unpack,
        },
        iotdb.keystore().get("/transports/ExpressTransport/initd"), {
            prefix: "/",
            key_things: "item",
        }
    );

    self.native = app;

    self._setup_app_thing_band();
    self._setup_app_thing();
    self._setup_app_things();

    this._emitter = new events.EventEmitter();
};

ExpressTransport.prototype = new iotdb_transport.Transport();
ExpressTransport.prototype._class = "ExpressTransport";

/* --- web --- */

ExpressTransport.prototype._setup_app_things = function () {
    var self = this;

    var channel = self.initd.channel(self.initd);

    self.native.use(channel, function (request, response) {
        var ids = [];
        self.list({
            user: request.user,
        }, function (error, ld) {
            if (!error && ld && ld.id) {
                ids.push(self.initd.channel(self.initd, ld.id));
                return;
            }

            var rd = {
                "@id": self.initd.channel(self.initd),
                "@context": "https://iotdb.org/pub/iot",
            };

            if (error) {
                rd.error = _.error.message(ld.error);
                response.status(_.error.code(ld.error));
            } else {
                rd[self.initd.key_things] = ids;
            }

            return response
                .set('Content-Type', 'application/json')
                .set('Access-Control-Allow-Origin', '*')
                .send(JSON.stringify(rd, null, 2));

        });
    });
};

ExpressTransport.prototype._setup_app_thing = function () {
    var self = this;

    var channel = self.initd.channel(self.initd, ':id');

    self.native.use(channel, function (request, response) {
        self.bands({
            id: request.params.id,
            user: request.user,
        }, function (error, ad) {
            var rd = {
                "@id": self.initd.channel(self.initd, request.params.id),
                "@context": "https://iotdb.org/pub/iot",
            };

            _.mapObject(ad.bandd, function (url, band) {
                if (url) {
                    rd[band] = url;
                } else {
                    rd[band] = self.initd.channel(self.initd, request.params.id, band);
                }
            });

            return response
                .set('Content-Type', 'application/json')
                .set('Access-Control-Allow-Origin', '*')
                .send(JSON.stringify(rd, null, 2));
        });
    });
};

ExpressTransport.prototype._setup_app_thing_band = function () {
    var self = this;

    var channel = self.initd.channel(self.initd, ':id', ':band');

    self.native.get(channel, function (request, response) {
        self.get({
            id: request.params.id,
            band: request.params.band,
            user: request.user,
        }, function (error, gd) {
            var rd = {
                "@id": self.initd.channel(self.initd, request.params.id, request.params.band),
            };

            if ((request.params.band === "istate") || (request.params.band === "ostate")) {
                rd["@context"] = self.initd.channel(self.initd, request.params.id, "model");
            } else if ((request.params.band === "meta") || (request.params.band === "connection")) {
                rd["@context"] = "https://iotdb.org/pub/iot";
            }

            if (!error && !gd.value) {
                error = new errors.NotFound();
            }

            if (error) {
                response.status(_.error.code(error));
            } else {
                rd = _.defaults(rd, gd.value);
            }

            if (request.params.band === "model") {
                if (rd["@context"]) {
                    delete rd["@context"]["@base"];
                    delete rd["@context"]["@vocab"];
                }
            }

            return response
                .set('Content-Type', 'application/json')
                .set('Access-Control-Allow-Origin', '*')
                .send(JSON.stringify(rd, null, 2));
        });
    });

    self.native.put(channel, function (request, response) {
        self.get({
            id: request.params.id,
            band: request.params.band,
            user: request.user,
        }, function (error, gd) {
            if (error) {
                var rd = {
                    "@id": self.initd.channel(self.initd, gd.id, gd.band),
                };
                rd.error = _.error.message(gd.error);

                response.status(_.error.code(gd.error));

                return response
                    .set('Content-Type', 'application/json')
                    .send(JSON.stringify(rd, null, 2));
            }

            var d = request.body;
            _.timestamp.update(d);

            self._emitter.emit("updated", {
                id: request.params.id,
                band: request.params.band,
                value: d,
                user: request.user,
                response: response,
            });
        });
    });
};

/* --- methods --- */

/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 *  <p>
 *  Inherently this does nothing. To properly support this
 *  you should use <code>iotdb.transport.bind</code>
 *  to effectively replace this function.
 */
ExpressTransport.prototype.list = function (paramd, callback) {
    var self = this;
    var ld;

    self._validate_list(paramd, callback);

    ld = _.d.clone.shallow(paramd);
    callback(new errors.NeverImplemented(), ld);
};

/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 *  <p>
 *  Inherently this does nothing. To properly support this
 *  you should use <code>iotdb.transport.bind</code>
 *  to effectively replace this function.
 */
ExpressTransport.prototype.added = function (paramd, callback) {
    var self = this;

    var channel = self.initd.channel(self.initd);
};

/**
 *  See {iotdb_transport.Transport#bands} for documentation.
 *  <p>
 *  Inherently this does nothing. To properly support this
 *  you should use <code>iotdb.transport.bind</code>
 *  to effectively replace this function.
 */
ExpressTransport.prototype.bands = function (paramd, callback) {
    callback(new errors.NeverImplemented(), null);
};

/**
 *  See {iotdb_transport.Transport#get} for documentation.
 *  <p>
 *  Inherently this does nothing. To properly support this
 *  you should use <code>iotdb.transport.bind</code>
 *  to effectively replace this function.
 */
ExpressTransport.prototype.get = function (paramd, callback) {
    callback(new errors.NeverImplemented(), null);
};

/**
 *  See {iotdb_transport.Transport#update} for documentation.
 *  <p>
 *  Inherently this does nothing. To properly support this
 *  you should use <code>iotdb.transport.bind</code>
 *  to effectively replace this function.
 */
ExpressTransport.prototype.put = function (paramd, callback) {
    callback(new errors.NeverImplemented(), null);
};

/**
 *  See {iotdb_transport.Transport#updated} for documentation.
 *  <p>
 *  This will be triggered from the Express/Express API
 */
ExpressTransport.prototype.updated = function (paramd, callback) {
    var self = this;

    if (arguments.length === 1) {
        paramd = {};
        callback = arguments[0];
    }

    self._validate_updated(paramd, callback);

    self._emitter.on("updated", function (ud) {
        if (paramd.id && (ud.id !== paramd.id)) {
            return;
        }
        if (paramd.band && (ud.band !== paramd.band)) {
            return;
        }

        var response = ud.response;
        delete ud.response;

        callback(null, ud);

        var rd = {
            "@id": self.initd.channel(self.initd, ud.id, ud.band),
        };

        return response
            .set('Content-Type', 'application/json')
            .send(JSON.stringify(rd, null, 2));
    });
};

/**
 *  See {iotdb_transport.Transport#remove} for documentation.
 *  <p>
 *  Inherently this does nothing. To properly support this
 *  you should use <code>iotdb.transport.bind</code>
 *  to effectively replace this function.
 */
ExpressTransport.prototype.remove = function (paramd) {
    var self = this;

    self._validate_remove(paramd, callback);

    var rd = _.d.clone.shallow(paramd);
    delete rd.band;
    delete rd.value;

    callback(new errors.NotImplemented(), rd);
};

/* -- internals -- */
var _encode = function (s) {
    return s.replace(/[\/$%#.\]\[]/g, function (c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
};

var _decode = function (s) {
    return decodeURIComponent(s);
};

var _unpack = function (d) {
    return _.d.transform(d, {
        pre: _.ld_compact,
        key: _decode,
    });
};

var _pack = function (d) {
    return _.d.transform(d, {
        pre: _.ld_compact,
        key: _encode,
    });
};

/**
 *  API
 */
exports.ExpressTransport = ExpressTransport;
