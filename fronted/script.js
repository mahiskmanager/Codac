let user = JSON.parse(localStorage.getItem('user')) || { id:null, balance:0 };
document.getElementById('balance').textContent = user.balance;

// Apostar
document.getElementById('placeBet').addEventListener('click', async()=>{
    const amount = parseFloat(document.getElementById('betAmount').value);
    const res = await fetch('/api/bet',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ userId:user.id, amount })
    });
    const data = await res.json();
    if(data.status==='ok'){
        user.balance = data.balance;
        document.getElementById('balance').textContent = user.balance;
        document.getElementById('result').textContent = data.resultText;
    }else alert(data.message);
});

// Depositar Stripe
document.getElementById('depositStripe').addEventListener('click', async()=>{
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const res = await fetch('/api/create-checkout-session',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ amount, userId:user.id })
    });
    const data = await res.json();
    const stripeObj = Stripe('pk_test_XXXXXXXXXXXXXXXXXXXXXXXX'); // reemplaza con tu clave pública
    stripeObj.redirectToCheckout({ sessionId:data.id });
});

// Vincular Banrural
document.getElementById('connectBank').addEventListener('click', ()=>{
    window.location.href = '/api/auth';
});

// ebi‑pay placeholder: monto
document.getElementById('depositAmount').addEventListener('input', (e)=>{
    document.getElementById('ebiAmount').value = e.target.value;
});
