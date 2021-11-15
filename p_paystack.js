var express = require('express')
var router = express.Router()
const axios = require('axios')

const paystackKey = {
    public: "pk_test_6b089bb420345f1b0e80bec8edb79c088a8f1368",
    secret: "sk_test_449354723f4733ea5440d40c40d3b9db39c06ec5"
}

const instance = axios.create({
    baseURL: 'https://api.paystack.co',
    timeout: 30000,
    headers: {
        Authorization: `Bearer ${paystackKey.secret}`
    }
});

const paystack = require('paystack')(paystackKey.secret);

function savePaystackCharge(response) {
    DB.set(`paystackChargeSignature::${response.data.data.authorization.signature}`, {
        email: response.data.data.customer.email,
        authorizationCode: response.data.data.authorization.authorization_code
    });

    DB.set(`paystackUserCharge::${response.data.data.customer.email}`, {
        email: response.data.data.customer.email,
        signature: response.data.data.authorization.signature
    });
}

router.post('/charge/init', async (req, res) => {
    const { email, cardNumber, cardExpiryMonth, cardExpiryYear, cardCvc, cardPin} = req.body;

    const response = await instance.post('/charge', {
        email,
        amount: 10000,
        card: {
            number: cardNumber,
            cvv: cardCvc,
            'expiry_month': cardExpiryMonth,
            'expiry_year': cardExpiryYear
        },
        // pin: cardPin
    })

    if(response.data.status === true && response.data.data.status === 'success') {
        savePaystackCharge(response);
    }

    res.json({
        status: true,
        message: 'charge transaction initialize successful',
        data: response.data
    })
})

router.post('/charge/submit_pin', async (req, res) => {
    const { reference, pin} = req.body;

    const response = await instance.post('/charge/submit_pin', {
        reference,
        pin,
    })

    if (response.data.status === true && response.data.data.status === 'success') {
        savePaystackCharge(response);
    }

    res.json({
        status: true,
        message: 'charge transaction initialize successful',
        data: response.data
    })
})

router.post('/charge/submit_otp', async (req, res) => {
    const { reference, otp} = req.body;

    const response = await instance.post('/charge/submit_otp', {
        reference,
        otp,
    })

    if (response.data.status === true && response.data.data.status === 'success') {
        savePaystackCharge(response);
    }

    res.json({
        status: true,
        message: 'charge transaction initialize successful',
        data: response.data
    })
})

router.post('/charge/submit_phone', async (req, res) => {
    const { reference, phone} = req.body;

    const response = await instance.post('/charge/submit_phone', {
        reference,
        phone,
    })

    if (response.data.status === true && response.data.data.status === 'success') {
        savePaystackCharge(response);
    }

    res.json({
        status: true,
        message: 'charge transaction initialize successful',
        data: response.data
    })
})

router.post('/charge/submit_birthday', async (req, res) => {
    const { reference, birthday} = req.body;

    const response = await instance.post('/charge/submit_birthday', {
        reference,
        birthday,
    })

    if (response.data.status === true && response.data.data.status === 'success') {
        savePaystackCharge(response);
    }

    res.json({
        status: true,
        message: 'charge transaction initialize successful',
        data: response.data
    })
})

//Open Url

// define the about route
router.post('/charge/pay', async (req, res) => {
    const { email, amount } = req.body;

    const paystackUserChargeObj = await DB.get(`paystackUserCharge::${email}`);

    if (!paystackUserChargeObj) {
        return res.status(400).json({
            status: false,
            message: 'No unique signature found'
        })
    }
    
    const paystackChargeSignatureObj = await DB.get(`paystackChargeSignature::${paystackUserChargeObj.signature}`);

    if (!paystackChargeSignatureObj) {
        return res.status(400).json({
            status: false,
            message: 'No signature authorization found'
        })
    }

    const response = await instance.post('/transaction/charge_authorization', {
        email,
        amount: amount * 100,
        authorization_code: paystackChargeSignatureObj.authorizationCode,
    })

    if (response.data.status === true && response.data.data.status === 'success') {
        DB.set(`paystackChargeSignature::${response.data.data.authorization.signature}`, {
            email: response.data.data.customer.email,
            authorizationCode: response.data.data.authorization.authorization_code
        });
    }

    res.json({
        status: true,
        message: 'charge transaction successful',
        data: response.data
    })
})

module.exports = router