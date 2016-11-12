var express = require("express");
var bodyParser = require("body-parser");

import csvWriter from "csv-write-stream";
import _ from "lodash";
import fs from "fs";
import {MongoClient} from "mongodb";
import async from "async";
import clustering from "density-clustering"

let tags = [];
let writer = csvWriter();

MongoClient.connect('mongodb://localhost:27017/bitgraph', (err, db) => {
    let raw = fs.readFileSync("companies.csv").toString("utf-8").split("\n");
    let companies = _.map(raw, (line) => line.split(",")[0]);
    companies.shift();

    // async.eachLimit(companies, 1, (company, callback) => {
    //     let timeout = setTimeout(callback, 3000);
    //     yahooFinance.historical({
    //         symbol: company,
    //         from: '2014-01-01',
    //         to: '2016-11-12',
    //         period: 'd'
    //     }, (err, quotes) => {
    //         if (err) {
    //             clearTimeout(timeout);
    //             callback();
    //         }
    //         else if (quotes.length > 0) {
    //             db.collection(company).insertMany(quotes).then((error) => {
    //                 clearTimeout(timeout);
    //                 callback();
    //             });
    //         }
    //     })
    // })
    let data = [], clusters;

    async.series([
        (callback) => {
            async.eachLimit(companies.slice(0, 1000), 1, (company, callback) => {
                db.collection(company).find().toArray().then(results => {
                    let arr = _.map(results, (row) => row.open).slice(0, 24);
                    if (arr && arr.length > 0) data.push(arr);
                    callback();
                })
            }, () => {
                callback()
            })
        },
        (callback) => {
            let dbscan = new clustering.KMEANS();
            clusters = dbscan.run(data, Math.floor(data.length / 20));
            callback();
        },
        (callback) => {
            _.each(clusters, (cluster) => {
                console.log(cluster)
            })
            console.log("TOTAL CLUSTERS: " + clusters.length)
        }
    ])

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

