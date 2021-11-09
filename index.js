const express = require('express')
const cors = require('cors')

const app = express()
const port = 4000

const stripeKey = {
    public: "pk_test_GysJazKmClo7lPhA2cFFdYPf00F4XftLHK",
    secret: "sk_test_8UGkWZ55BFpJnyVExFM1Ia6C00RIJZgabN"
}

const stripe = require('stripe')(stripeKey.secret);
const JSONdb = require('simple-json-db');
const { json } = require('express')

const DB = new JSONdb(__dirname + "/data/database.json");

app.use(express.static('public'))
app.use(cors())

app.post('/api/charge/start', async (req, res) => {

    const result = DB.get(`users::akinjole@yahoo.com`);

    let customer = null

    if(result){
        customer = await stripe.customers.retrieve(result.stripe_customer_id);
    }else{
        customer = await stripe.customers.create({
            name: "Emmanuel Akinjole",
            email: "akinjole@yahoo.com",
            phone: "2348029649888"
        })

        DB.set(`users::${customer.email}`, {
            stripe_customer_id: customer.id,
        });
    }
    
    //#For android devices
    const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: customer.id },
        { apiVersion: '2019-09-09' }
    );

    const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
            number: '4000002500003155', //'4242424242424242',
            exp_month: 11,
            exp_year: 2022,
            cvc: '314',
        },
    });

    const paymentIntent = await stripe.paymentIntents.create({
        amount: 200000,
        currency: 'usd',
        customer: customer.id,
        setup_future_usage: 'off_session',
        // payment_method_types: ['card'],
        payment_method: paymentMethod.id
    });

    const paymentIntentConfirm = await stripe.paymentIntents.confirm(paymentIntent.id, {
        return_url: 'http://localhost:4000/status.html' 
    });

    console.log(paymentIntentConfirm);

    // To create a requires_capture PaymentIntent, see our guide at: https://stripe.com/docs/payments/capture-later
    // const paymentIntent = await stripe.paymentIntents.capture(
    //     'pi_1EUmyp2x6R10KRrhz0WmtMnF'
    // );

    if (paymentIntentConfirm.status === 'requires_payment_method') {
        return res.status(402).json({
            status: 'requires_payment_method',
            message: '402 error sha',
            data: null,
        })
    }
    
    if (paymentIntentConfirm.status === 'requires_action') {
        return res.status(200).json({
            status: 'requires_action',
            message: '',
            data: {
                next_action: paymentIntentConfirm.next_action,
                publishableKey: stripeKey.public,
            },
        })
    }
    
    if (paymentIntentConfirm.status === 'succeeded') {
        return res.status(200).json({
            status: 'succeeded',
            message: 'Charge successful',
            data: null,
        })
    }

    return res.status(400).json({
        status: true,
        message: 'Unknown error',
        data: null,
    })

    

    // res.json({
    //     paymentIntent: paymentIntent.client_secret,
    //     ephemeralKey: ephemeralKey.secret,
    //     customer: customer.id,
    //     publishableKey: stripeKey.public,
    // });
});

app.post('/api/charge/pay', async (req, res) => {

    const result = DB.get(`users::akinjole@yahoo.com`);

    if (result) {
        const paymentMethods = await stripe.paymentMethods.list({
            customer: result.stripe_customer_id,
            type: 'card',
        });
        
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: 1099,
                currency: 'usd',
                customer: result.stripe_customer_id,
                payment_method: paymentMethods.data.find((data) => data.type === 'card').id,
                off_session: true,
                confirm: true,
            });

            console.log(paymentIntent);

            res.status(200);
            res.json({
                message: 'charge successfully'
            })
        } catch (err) {
            // Error code will be authentication_required if authentication is needed
            console.log('Error code is: ', err.code);
            console.log('Error code is: ', err);
            const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(err.raw.payment_intent.id);
            console.log('PI retrieved: ', paymentIntentRetrieved.id);

            res.status(400);
            res.json({
                message: 'charge unsuccessfully'
            })
        }
    }
});





app.post('/api/transfer/init', async (req, res) => {

    const result = DB.get(`users::akinjole@yahoo.com`);

    let customer = null

    if (result) {
        customer = await stripe.customers.retrieve(result.stripe_customer_id);
    } else {
        customer = await stripe.customers.create({
            name: "Emmanuel Akinjole",
            email: "akinjole@yahoo.com",
            phone: "2348029649888"
        })

        DB.set(`users::${customer.email}`, {
            stripe_customer_id: customer.id,
        });
    }

    //Check if bankAccount already exists using the sourceID
    const bankAccount = await stripe.customers.createSource(customer.id,
        { 
            source: {
                "object": "bank_account",
                "country": "US",
                "currency": "USD",
                "account_holder_name": "Jane Austen",
                "account_holder_type": "individual",
                "routing_number": "104014138",
                "account_number": "000123456789",
            } 
        }
    );

    res.json(bankAccount);
});


app.post('/api/transfer/fire', async (req, res) => {

    const payout = await stripe.payouts.create({
        // destination: 'ba_1JtxwpEMjlIyQCpuw9sKyi6V',
        amount: 1100,
        currency: 'USD',
    });

    res.json(payout);
});

app.post('/webhook/stripe', express.json({ type: 'application/json' }), (request, response) => {
    const event = request.body;

    console.log(`Event fired --> ${event.type}`)
    
    response.send();
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})