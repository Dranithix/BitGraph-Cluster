var express = require("express");
var bodyParser = require("body-parser");

import yahooFinance from "yahoo-finance";
import csvWriter from "csv-write-stream";
import _ from "lodash";
import fs from "fs";
import {MongoClient} from "mongodb";
import async from "async";

let tags = [];
let writer = csvWriter();

MongoClient.connect('mongodb://localhost:27017/bitgraph', (err, db) => {
    let raw = fs.readFileSync("companies.csv").toString("utf-8").split("\n");
    let companies = _.map(raw, (line) => line.split(",")[0]);
    companies.shift();

    async.eachLimit(companies, 1, (company, callback) => {
        yahooFinance.historical({
            symbol: company,
            from: '2014-01-01',
            to: '2016-11-12',
            period: 'd'
        }, (err, quotes) => {
            db.collection(company).insertMany(quotes).then(() => {
                callback();
            });
        })
    })

    let app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

    app.get("/", (req, res) => {
        res.send(tags);
    });

    let server = app.listen(3000, function () {
        console.log("Listening on port %s...", server.address().port);
    });
});

