var config = require('./config.json');
var app = require('express')();
var coins = ['TUSD', 'USDT', 'USDC', 'USDC', 'PAX', 'USDS', 'USDSB', 'BUSD' ];

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
				if (result.balances[index].asset == "USDSB") {
					saldo_USDSB = (parseFloat(result.balances[index].locked) + parseFloat(result.balances[index].free)).toFixed(8);
				}
				if (result.balances[index].asset == "BUSD") {
					saldo_BUSD = (parseFloat(result.balances[index].locked) + parseFloat(result.balances[index].free)).toFixed(8);
				}

				if (result.balances[index].asset == config.MARKET) {
					marketBalanceLocked = parseFloat(result.balances[index].locked);
					marketBalanceFree = parseFloat(result.balances[index].free);
                } else if (result.balances[index].asset == config.CURRENCY) {
					currencyBalanceLocked = parseFloat(result.balances[index].locked);
					currencyBalanceFree = parseFloat(result.balances[index].free);
                }
				
				if (coins.indexOf(result.balances[index].asset) > -1) {
					if((result.balances[index].asset != config.MARKET) && (result.balances[index].asset != config.CURRENCY)) {
						let otherCoinsLocked = parseFloat(result.balances[index].locked);
						let otherCoinsFree = parseFloat(result.balances[index].free);
						otherStables = (otherStables + (otherCoinsLocked + otherCoinsFree));
					}
				}	
		}
		total = (marketBalanceLocked + marketBalanceFree + currencyBalanceLocked + currencyBalanceFree + otherStables).toFixed(8);

	});

	
// define as variaveis
saldo_TUSD = 0;
saldo_USDT = 0;
saldo_USDC = 0;
saldo_PAX = 0;
saldo_USDS = 0;
saldo_USDSB = 0;
saldo_BUSD = 0;
total_stable = 0;
total = 0;
marketBalanceLocked = 0;
marketBalanceFree = 0;
currencyBalanceLocked = 0;
currencyBalanceFree = 0;
otherStables = 0;



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

app.listen(config.LISTEN_PORT);
