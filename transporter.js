/*
 *  transporter.js
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

const iotdb = require('iotdb');
const _ = iotdb._;
const iotdb_transport = require('iotdb-transport');
const errors = require('iotdb-errors');

const Rx = require('rx');
const assert = require('assert');

const logger = iotdb.logger({
    name: 'iotdb-transport-fs',
    module: 'transporter',
});

const make = (initd, underlying, app) => {
    const self = iotdb_transport.make();
    self.name = "iotdb-transport-express";

    assert.ok(underlying);
    assert.ok(app);

    const _initd = _.d.compose.shallow(
        initd, {
            channel: iotdb_transport.channel,
            unchannel: iotdb_transport.unchannel,
            encode: s => s.replace(/[\/$%#.\]\[]/g, (c) => '%' + c.charCodeAt(0).toString(16)),
            decode: s => decodeURIComponent(s),
        },
        iotdb.keystore().get("/transports/iotdb-transport-express/initd"), {
            prefix: "/",
        }
    );

    // -- internals 
    const _app_get_things = () => {
        const url = _initd.channel(_initd, {});

        app.get(url, (request, response) => {
            underlying.list({
                user: request.user,
            })
                .reduce(( ids, ld ) => ids.concat([ "./" + ld.id, ]), [])
                .subscribe(
                    ids => {
                        const rd = {
                            "@id": url,
                            "@context": "https://iotdb.org/pub/iot",
                            "iot:thing": ids,
                        };

                        response
                            .set('Content-Type', 'application/json')
                            .set('Access-Control-Allow-Origin', '*')
                            .send(JSON.stringify(rd, null, 2));
                    },
                    error => response
                        .set('Content-Type', 'text/plain')
                        .status(_.error.code(error))
                        .send(_.error.message(error))
                );
        });
    };

    const _app_get_thing = () => {
        const url = _initd.channel(_initd, {
            id: ':id'
        });

        app.get(url, (request, response) => {
            underlying.bands({
                id: request.params.id,
                user: request.user,
            })
                .filter(d => [ "istate", "ostate", "meta", "model", "meta", "connection" ].indexOf(d.band) > -1)
                .reduce(( b, d ) => { b["iot:" + d.band] = "./" + d.band; return b }, {})
                .subscribe(
                    b => {
                        const rd = _.d.compose.shallow({
                            "@id": _initd.channel(_initd, {
                                id: request.params.id
                            }),
                            "@context": "https://iotdb.org/pub/iot",
                            "@type": "iot:Thing",
                        }, b);

                        response
                            .set('Content-Type', 'application/json')
                            .set('Access-Control-Allow-Origin', '*')
                            .send(JSON.stringify(rd, null, 2));
                    },
                    error => response
                        .set('Content-Type', 'text/plain')
                        .status(_.error.code(error))
                        .send(_.error.message(error))
                );
        });
    };

    const _app_get_band = () => {
        const url = _initd.channel(_initd, {
            id: ':id', 
            band: ':band'
        });

        app.get(url, (request, response) => {
            underlying.get({
                id: request.params.id,
                band: request.params.band,
                user: request.user,
            })
                .first()
                .subscribe(
                    d => {
                        const rd = _.d.compose.shallow({
                            "@id": _initd.channel(_initd, {
                                id: request.params.id, 
                                band: request.params.band
                            }),
                            "@context": "https://iotdb.org/pub/iot",
                            "iot:thing": "..",
                        }, d.value);

                        response
                            .set('Content-Type', 'application/json')
                            .set('Access-Control-Allow-Origin', '*')
                            .send(JSON.stringify(rd, null, 2));
                    },
                    error => {
                        if (error instanceof Rx.EmptyError) {
                            error = new errors.NotFound();
                        }

                        response
                            .set('Content-Type', 'text/plain')
                            .status(_.error.code(error))
                            .send(_.error.message(error))
                    }

                );
        });
    };

    const _app_put_band = () => {
        const url = _initd.channel(_initd, {
            id: ':id', 
            band: ':band'
        });

        app.put(url, (request, response) => {
            const _handle = value => {
                underlying.put({
                    id: request.params.id,
                    band: request.params.band,
                    value: _.timestamp.add(request.body),
                    user: request.user,
                })
                    .first()
                    .subscribe(
                        d => {
                            const rd = _.d.compose.shallow({
                                "@id": _initd.channel(_initd, {
                                    id: request.params.id, 
                                    band: request.params.band
                                }),
                                "@context": "https://iotdb.org/pub/iot",
                                "iot:thing": "..",
                            }, d.value);

                            response
                                .set('Content-Type', 'application/json')
                                .set('Access-Control-Allow-Origin', '*')
                                .send(JSON.stringify(rd, null, 2));
                        },
                        error => {
                            if (error instanceof Rx.EmptyError) {
                                error = new errors.NotFound();
                            }

                            response
                                .set('Content-Type', 'text/plain')
                                .status(_.error.code(error))
                                .send(_.error.message(error))
                        }

                    );
            };

            // we treat PUT as a PATCH
            underlying.get({
                id: request.params.id,
                band: request.params.band,
                user: request.user,
            })
                .first()
                .subscribe(
                    d => {
                        _handle(_.d.compose.shallow(request.body, d.value));
                    },
                    error => {
                        _handle(request.body);
                    })

        });
    };

    _app_put_band();
    _app_get_band();
    _app_get_thing();
    _app_get_things();

    return self;
};

/**
 *  API
 */
exports.make = make;

