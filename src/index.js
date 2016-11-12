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
    // let data = {}, clusters, network;
    //
    // async.series([
    //     (callback) => {
    //         async.eachLimit(companies.slice(0, 500), 1, (company, callback) => {
    //             db.collection(company).find().toArray().then(results => {
    //                 let arr = _.map(results, (row) => row.open).slice(0, 6);
    //                 if (arr && arr.length > 0) data[company] = arr;
    //                 callback();
    //             })
    //         }, () => {
    //             callback()
    //         })
    //     },
    //     (callback) => {
    //         let ideas = _.map(_.values(data), (val, index) => {
    //             // val.unshift(Object.keys(data)[index]);
    //             return val;
    //         });
    //         let lines = "";
    //
    //         _.each(ideas, row => {
    //             lines += row.join(",") + "\n";
    //         })
    //
    //         fs.writeFileSync(`data.csv`, lines);
    //
    //         console.log(Object.keys(data).join("\n"));
    //
    //         // let dbscan = new clustering.KMEANS();
    //         // let values = _.values(data)
    //         // clusters = dbscan.run(values, Math.floor(values.length / 10));
    //         callback();
    //     },
    //     // (callback) => {
    //     //     let keys = Object.keys(data);
    //     //     network = _.map(clusters, cluster => _.map(cluster, member => keys[member]))
    //     //     console.log("TOTAL CLUSTERS: " + network.length)
    //     // }
    // ])

    let app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

    // app.get("/", (req, res) => {
    //     res.sendFile(path.join(__dirname + '/index.html'));
    // });

    app.use('/', express.static('views'))

    let server = app.listen(3000, function () {
        console.log("Listening on port %s...", server.address().port);
    });
});

