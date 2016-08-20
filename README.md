# iotdb-transport-express
[IOTDB](https://iotdb.org) Transporter for [Express](https://expressjs.com/). 

<img src="https://raw.githubusercontent.com/dpjanes/iotdb-homestar/master/docs/HomeStar.png" align="right" />

This module will let you create web pages with your transporters. 
There's two different (but complimentary) transporters in this package,
one for just serving pages and another for longpolling so you 
can get updates

There are code samples in GitHub.

# Use
## Express Transporter

Use as follows. First, create an app

    const express = require('express');
    const body_parser = require("body-parser");
    const unirest = require('unirest');

    const app = express();
    app.use(body_parser.json());
    app.listen(3000, () => {});

Then get another transporter as a "source". Typically this will be IOTDB.
In this particular example, we will connect to a WeMoSocket on the network.

    const iotdb = require("iotdb");
    iotdb.use("homestar-wemo");
    
    const things = iotdb.connect("WeMoSocket");

    const iotdb_transport = require("iotdb-transport-iotdb");
    const iotdb_transporter = iotdb_transport.make({}, things);

Then we create a Express Transporter.

    const express_transport = require("iotdb-transport-express");
    const express_transporter = express_transport.make({
        prefix: "/things",
    }, app)

Then we tell the Express Transporter to get all the data from the IOTDB Transporter.

    express_transporter.use(iotdb_transporter)

That's it - we are operational. If you go to [http://localhost:3000/things](http://localhost:3000/things)
you will see an API to your things. 

## Express Longpoll Transporter

The setup is much the same as above, except you'll need
to have cookie support

    const cookie_parser = require("cookie-parser");
    app.use(cookie_parser());

Then add this code:

    const longpoll_transporter = express_transport.longpoll.make({
        prefix: "/things",
    }, app)

    longpoll_transporter.use(iotdb_transporter)

That's it - we are operational. If you go to [http://localhost:3000/things/.longpoll](http://localhost:3000/things/.longpoll)
it will longpoll until things change (or a timeout happens).

The Longpoll Transporter will batch multiple updates together, will support multiple clients
and probably everything else you want.
