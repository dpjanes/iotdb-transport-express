/*
 *  longpoll.js
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

const iotdb = require('iotdb');
const _ = iotdb._;
const iotdb_transport = require('iotdb-transport');
const errors = require('iotdb-errors');

const Rx = require('rx');
const events = require('events');

const logger = iotdb.logger({
    name: 'iotdb-transport-fs',
    module: 'longpoll',
});

const make = (initd, app) => {
    const self = iotdb_transport.make();

    const _app = app;
    const _subject_map = new Map();

    const _initd = _.d.compose.shallow(
        initd, {
            channel: iotdb_transport.channel,
            unchannel: iotdb_transport.unchannel,
            encode: s => s.replace(/[\/$%#.\]\[]/g, (c) => '%' + c.charCodeAt(0).toString(16)),
            decode: s => decodeURIComponent(s),
        },
        iotdb.keystore().get("/transports/iotdb-transport-express/initd"), {
            prefix: "/",
            name: "longpoll",
            cookie_key: "transport-longpoll",
        }
    );

    self.rx.list = (observer, d) => {
        observer.onCompleted();
    };

    self.rx.put = (observer, d) => {
        const rd = _.d.clone.shallow(d);

        _subject_map
            .forEach(subject => subject.onNext(rd));
        
        observer.onNext(rd);
        observer.onCompleted();
    };
    
    self.rx.get = (observer, d) => {
        observer.onCompleted();
    };
    
    self.rx.bands = (observer, d) => {
        observer.onCompleted();
    };

    self.rx.updated = (observer, d) => {
        observer.onCompleted();
    };

    // -- internals 
    const _app_get = () => {
        const url = _initd.channel(_initd, {
            id: _initd.name,
        });

        _app.use(url, (request, response) => {
            if (!request.cookies) {
                throw new errors.InternalError("cookies middleware is required");
            }

            let cookie_value = request.cookies[_initd.cookie_key]
            if (!cookie_value) {
                cookie_value = _.random.id(32);
                response.cookie(_initd.cookie_key, cookie_value, { maxAge: 900000, httpOnly: true });
            } 

            let subject = _subject_map.get(cookie_value);
            if (!subject) {
                _subject_map.set(cookie_value, subject = new Rx.ReplaySubject(null, 5 * 60 * 1000));
            }

            subject
                .reduce((ds, d) => ds.concat([ d ]), [])
                .subscribe(
                    d => {
                        response
                            .set('Content-Type', 'text/plain')
                            .send(JSON.stringify(ds, null, 2));
                    },
                    error => console.log("#", _.error.message(error)),
                    done => {
                        // subject = new Rx.ReplaySubject();
                        console.log("+", "<end>")
                    }
                )
        });
    };

    _app_get();

    return self;
};

/**
 *  API
 */
exports.make = make;
