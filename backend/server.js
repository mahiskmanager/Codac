require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

let users = [];

// Registro
app.post('/register', (req,res)=>{
    const { username,email,password } = req.body;
    const id = Date.now().toString();
    users.push({ id, username, email, password, balance:0 });
    res.json({ status:'ok', userId:id });
});

// Login
app.post('/login',(req,res)=>{
    const { email,password } = req.body;
    const user = users.find(u=>u.email===email && u.password===password);
    if(!user) return res.status(400).json({ status:'error', message:'Usuario no encontrado' });
    res.json({ status:'ok', user });
});

// Crear sesión de pago Stripe
app.post('/create-checkout-session', async(req,res)=>{
    const { amount, userId } = req.body;
    const session = await stripe.checkout.sessions.create({
        payment_method_types:['card'],
        line_items:[{
            price_data:{
                currency:'gtq',
                product_data:{ name:'Depósito Codac' },
                unit_amount: amount*100
            },
            quantity:1
        }],
        mode:'payment',
        success_url:`${REDIRECT_URI}?userId=${userId}&amount=${amount}`,
        cancel_url:`${REDIRECT_URI}?payment=cancel`
    });
    res.json({ id:session.id });
});

// Confirmar pago y actualizar balance
app.get('/payment-success', (req,res)=>{
    const { userId, amount } = req.query;
    const user = users.find(u=>u.id===userId);
    if(user) user.balance += parseFloat(amount);
    res.json({ status:'ok', balance:user.balance });
});

// Apostar
app.post('/bet', (req,res)=>{
    const { userId, amount } = req.body;
    const user = users.find(u=>u.id===userId);
    if(!user || user.balance < amount) return res.status(400).json({ status:'error', message:'Saldo insuficiente' });

    const win = Math.random() < 0.5;
    let resultText;
    if(win){
        const winnings = amount*2;
        user.balance += winnings;
        resultText = `Ganaste Q${winnings}!`;
    } else {
        user.balance -= amount;
        resultText = `Perdiste Q${amount}`;
    }
    res.json({ status:'ok', resultText, balance:user.balance });
});

// Banrural OAuth
app.get('/auth', (req,res)=>{
    const authUrl = `https://auth.banrural.com.gt/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=accounts:read transactions:read`;
    res.redirect(authUrl);
});

app.get('/oauth/callback', async(req,res)=>{
    const code = req.query.code;
    const tokenRes = await fetch('https://api.banrural.com.gt/v1/oauth/token', {
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({
            grant_type:'authorization_code',
            code: code,
            redirect_uri:REDIRECT_URI,
            client_id:CLIENT_ID,
            client_secret:CLIENT_SECRET
        })
    });
    const tokenData = await tokenRes.json();
    res.json(tokenData);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Servidor corriendo en http://localhost:${PORT}`));
