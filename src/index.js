var express = require("express");
var bodyParser = require("body-parser");

import yahooFinance from "yahoo-finance";
import csvWriter from "csv-write-stream";
import _ from "lodash";

var csv = require('csv-parser')
var fs = require('fs')

let tags = [];
let writer = csvWriter();

// fs.createReadStream('companies.csv')
//     .pipe(csv())
//     .on('data', (data) => {
//         tags.push(data['Symbol']);
//
//         yahooFinance.historical({
//             symbol: data['Symbol'],
//             from: '2014-01-01',
//             to: '2016-11-12',
//             period: 'd'
//         }, (err, quotes) => {
//             if (quotes.length > 0) {
//                 let lines = "";
//                 _.each(quotes, (quote) => {
//                     lines += _.values(quote).join(",") + "\n";
//                 })
//                 fs.writeFileSync(`quotes/${data['Symbol']}.csv`, lines);
//             }
//         })
//     });

let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get("/", (req, res) => {
    res.send(tags);
});

let server = app.listen(3000, function () {
    console.log("Listening on port %s...", server.address().port);
});