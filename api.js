var config = require('./config.json');
var app = require('express')();
var cron = require('node-cron');

const Binance = require('binance-api-node').default;
const client = Binance({
    apiKey: config.API_KEY,
    apiSecret: config.SECRET_KEY,
});

client.accountInfo({ useServerTime: true }).then((result) => {
	for (let index = 0; index < result.balances.length; index++) {
			if (result.balances[index].asset == "TUSD") {
				saldo_TUSD = (parseFloat(result.balances[index].locked) + parseFloat(result.balances[index].free)).toFixed(8);
			}
			if (result.balances[index].asset == "USDT") {
				saldo_USDT = (parseFloat(result.balances[index].locked) + parseFloat(result.balances[index].free)).toFixed(8);
			}
			if (result.balances[index].asset == "USDC") {
				saldo_USDC = (parseFloat(result.balances[index].locked) + parseFloat(result.balances[index].free)).toFixed(8);

			}
			if (result.balances[index].asset == "PAX") {
				saldo_PAX = (parseFloat(result.balances[index].locked) + parseFloat(result.balances[index].free)).toFixed(8);

			}
			if (result.balances[index].asset == "USDS") {
				saldo_USDS = (parseFloat(result.balances[index].locked) + parseFloat(result.balances[index].free)).toFixed(8);

			}
			if (result.balances[index].asset == "BUSD") {
				saldo_BUSD = (parseFloat(result.balances[index].locked) + parseFloat(result.balances[index].free)).toFixed(8);
			}
			
	}
	total = (parseFloat(saldo_TUSD) + parseFloat(saldo_USDT) + parseFloat(saldo_USDC) + parseFloat(saldo_PAX) + parseFloat(saldo_USDS) + parseFloat(saldo_BUSD));
});


// define as variaveis
saldo_TUSD = 0;
saldo_USDT = 0;
saldo_USDC = 0;
saldo_PAX = 0;
saldo_USDS = 0;
saldo_BUSD = 0;
total = 0;

app.get('/', (req, res) => {
	let total_investiment = (total - config.INITIAL_INVESTMENT).toFixed(8);
    res.json(
        {
            initialInvestment: config.INITIAL_INVESTMENT,
            balances: {
				usdt: parseFloat(saldo_USDT),
				tusd: parseFloat(saldo_TUSD),
				pax: parseFloat(saldo_PAX),
				usdc: parseFloat(saldo_USDC),
				usds: parseFloat(saldo_USDS),
				busd: parseFloat(saldo_BUSD)
            },
            profit: {
				Balance: parseFloat(total),
                USD: parseFloat(total_investiment),
                percent: parseFloat(((total - config.INITIAL_INVESTMENT) * 100 / config.INITIAL_INVESTMENT).toFixed(2))
            }
        }
    );
});

app.listen(80);
