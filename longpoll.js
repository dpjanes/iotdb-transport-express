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

    // boilerplate
    self.rx.list = (observer, d) => {
        observer.onCompleted();
    };

    self.rx.put = (observer, d) => {
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

    // important: when we get hooked up via use, _then_ start monitoring
    const _super_use = self.use;
    self.use = (...rest) => {
        _super_use(...rest);

        _monitor();
    };

    // -- internals 
    const _make_replay_subject = () => {
        return new Rx.ReplaySubject(null, 5 * 60 * 1000);
    };

    const _updated = d => {
        const rd = _.d.clone.shallow(d);

        _subject_map
            .forEach(subject => {
                subject.onNext(rd);
                subject.__any = true;

                if (subject.__waiting) {
                    subject.onCompleted();
                }
            })
    };

    const _monitor = () => {
        self.updated()
            .subscribe(
                _updated,
                error => {
                    logger.error({
                        method: "_monitor/updated/error",
                        error: _.error.message(error),
                    }, "this should really never happy - likely no more updated will happen");
                }
            );
    };

    const _app_get = () => {
        const url = _initd.channel(_initd, {
            id: _initd.name,
        });

        _app.use(url, (request, response) => {
            if (!request.cookies) {
                throw new errors.Internal("cookies middleware is required");
            }

            let cookie_value = request.cookies[_initd.cookie_key]
            if (!cookie_value) {
                cookie_value = _.random.id(32);
                response.cookie(_initd.cookie_key, cookie_value, { maxAge: 900000, httpOnly: true });
            } 

            let subject = _subject_map.get(cookie_value);
            if (!subject) {
                _subject_map.set(cookie_value, subject = _make_replay_subject());
            }

            subject.__waiting = true;
            subject
                .reduce((ad, d) => { ad[_initd.channel(_initd, d)] = d.value; return ad }, {})
                .subscribe(
                    ad => {
                        response
                            .set('Content-Type', 'text/plain')
                            .send(JSON.stringify(ad, null, 2));
                    },
                    error => {
                        logger.error({
                            method: "_app_get/_app.use/subject.error",
                            error: _.error.message(error),
                        }, "may not be serious");
                    },
                    done => {
                        _subject_map.set(cookie_value, subject = _make_replay_subject());
                        console.log("+", "<end>")
                    }
                )

            if (subject.__any) {
                subject.onCompleted();
            }
        });
    };

    _app_get();
    // _monitor();

    return self;
};

/**
 *  API
 */
exports.make = make;
