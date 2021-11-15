const express = require('express')
const cors = require('cors')
const JSONdb = require('simple-json-db');
const bodyParser = require('body-parser')
const stripeRoute = require('./p_stripe')
const paystackRoute = require('./p_paystack')


const app = express()
const port = 4000
const DB = new JSONdb(__dirname + "/data/database.json");
global.DB = DB;

app.use(express.static('public'))
// app.use(express)
app.use(cors())
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

app.use('/api/stripe', stripeRoute)
app.use('/api/paystack', paystackRoute)

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})