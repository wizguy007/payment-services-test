var express = require('express')
var router = express.Router()

const stripeKey = {
    public: "pk_test_GysJazKmClo7lPhA2cFFdYPf00F4XftLHK",
    secret: "sk_test_8UGkWZ55BFpJnyVExFM1Ia6C00RIJZgabN"
}

const stripe = require('stripe')(stripeKey.secret);

// define the home page route
router.post('/charge/init', async (req, res) => {
    const result = DB.get(`users::emmanuelakinjole@gmail.com`);

    let customer = null

    if (result) {
        customer = await stripe.customers.retrieve(result.stripe_customer_id);
    } else {
        customer = await stripe.customers.create({
            name: "Mario Gotze",
            email: "emmanuelakinjole@gmail.com",
            phone: "2348029649888"
        })

        DB.set(`users::${customer.email}`, {
            stripe_customer_id: customer.id,
        });
    }

    const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
            number: '4242424242424242', //'4000002500003155', //
            exp_month: 11,
            exp_year: 2022,
            cvc: '314',
        },
    });

    let paymentIntent = await stripe.paymentIntents.create({
        amount: 200000,
        currency: 'usd',
        customer: customer.id,
        setup_future_usage: 'off_session',
        payment_method: paymentMethod.id
    });

    paymentIntent = await stripe.paymentIntents.confirm(paymentIntent.id);

    if (paymentIntent.status === 'requires_payment_method') {
        return res.status(402).json({
            status: 'requires_payment_method',
            message: '402 error sha',
            data: {
                publishableKey: stripeKey.public,
            },
        })
    }

    if (paymentIntent.status === 'requires_action') {
        return res.status(200).json({
            status: 'requires_action',
            message: '',
            data: {
                next_action: paymentIntent.next_action,
                publishableKey: stripeKey.public,
                paymentIntent: paymentIntent.client_secret,
            },
        })
    }

    if (paymentIntent.status === 'requires_confirmation') {
        return res.status(200).json({
            status: 'requires_confirmation',
            message: '',
            data: {
                publishableKey: stripeKey.public,
                paymentIntent: paymentIntent.client_secret,
            },
        })
    }

    if (paymentIntent.status === 'succeeded') {
        return res.status(200).json({
            status: 'succeeded',
            message: 'Charge successful',
            data: {
                publishableKey: stripeKey.public,
            },
        })
    }

    return res.status(400).json({
        status: true,
        message: 'Unknown error',
        data: null,
    })
})

router.post('/charge/pay', async (req, res) => {
    
    const result = DB.get(`users::emmanuelakinjole@gmail.com`);

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
})

router.post('/transfer/init', async (req, res) => {

    const account = await stripe.accounts.create({
        type: 'express',
        country: 'CA',
        email: 'emmanuelakinjole@yahoo.com',
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
        },
        external_account: {
            "object": "bank_account",
            "country": "CA",
            "currency": "USD",
            "account_holder_name": "Jane Austen",
            "account_holder_type": "individual",
            "routing_number": "11000000",
            "account_number": "000123456789",
        }
    });


    // const bankAccount = await stripe.accounts.createExternalAccount(
    //     'acct_1JuE9o2SA0zAjV90',
    //     {
    //         external_account: {
    //             "object": "bank_account",
    //             "country": "US",
    //             "currency": "USD",
    //             "account_holder_name": "Jane Austen",
    //             "account_holder_type": "individual",
    //             "routing_number": "104014138",
    //             "account_number": "000123456789",
    //         },
    //     }
    // );

    // const result = DB.get(`users::emmanuelakinjole@gmail.com`);

    // let customer = null

    // if (result) {
    //     customer = await stripe.customers.retrieve(result.stripe_customer_id);
    // } else {
    //     customer = await stripe.customers.create({
    //         name: "Mario Gotze",
    //         email: "emmanuelakinjole@gmail.com",
    //         phone: "2348029649888"
    //     })

    //     DB.set(`users::${customer.email}`, {
    //         stripe_customer_id: customer.id,
    //     });
    // }

    // //Check if bankAccount already exists using the sourceID
    // const bankAccount = await stripe.customers.createSource(customer.id,
    //    {
    //         source: {
    //             "object": "bank_account",
    //             "country": "US",
    //             "currency": "USD",
    //             "account_holder_name": "Jane Austen",
    //             "account_holder_type": "individual",
    //             "routing_number": "104014138",
    //             "account_number": "000123456789",
    //         }
    //     }
    // );

    return res.json(account);
});


router.post('/transfer/fire', async (req, res) => {

    // const account = await stripe.accounts.retrieve(
    //     'acct_1JuE9o2SA0zAjV90'
    // );

    const payout = await stripe.payouts.create({
        destination: 'ba_1JuFbq2SKpXtemhvXc8CTrY7',
        amount: 1100,
        currency: 'USD',
    });

    // acct_1JuEVc2QJ0i4xEoZ

    res.json(payout);
});

router.post('/webhook', express.json({ type: 'application/json' }), (request, response) => {
    const event = request.body;

    console.log(`Event fired --> ${event.type}`)

    response.send();
});

module.exports = router