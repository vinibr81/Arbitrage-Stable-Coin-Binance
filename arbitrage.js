var config = require('./config.json');
var cron = require('node-cron');

const Binance = require('binance-api-node').default;
const client = Binance({
    apiKey: config.API_KEY,
    apiSecret: config.SECRET_KEY,
});
	
const TelegramBot = require('node-telegram-bot-api');
const TOKEN = config.BOT_TOKEN;
var bot = new TelegramBot(TOKEN, {polling: true});

bot.sendMessage(config.BOT_CHAT, '\u{1F916} Arbitrage bot iniciando');

var task = cron.schedule('*/' + config.LOOP_TIME + ' * * * * *', () => {
	// Limpa o console
	console.clear();
	
	// Detecta o par com menor e maior valor
	for (let i=0; i<coins.length; i++) {
  		client.dailyStats({ symbol: coins[i] }).then((result) => {
			if(result.lastPrice > max_price) {
				max_price = parseFloat(result.lastPrice).toFixed(2);
				max_par = coins[i];
			}			
		});
	}
	
	for (let i=0; i<coins.length; i++) {
  		client.dailyStats({ symbol: coins[i] }).then((result) => {
			if(result.lastPrice < min_price) {
				min_price = parseFloat(result.lastPrice).toFixed(2);
				min_par = coins[i];
			}			
			
			/*if(min_price == 0) {
				min_price = parseFloat(result.lastPrice).toFixed(2);
				min_par = coins[i];
			} else {
				if(result.lastPrice < min_price) {
					min_price = parseFloat(result.lastPrice).toFixed(2);
					min_par = coins[i];
				}
			}*/
		});
	}
	
	// Verifica o saldo para compras e iniciar a negociação
	client.accountInfo({ useServerTime: true }).then((result) => {
		for (let index = 0; index < result.balances.length; index++) {
			if (result.balances[index].asset == min_par) {
				balance_trade = parseFloat(result.balances[index].free);
			}
		}
	});

	// Verifica a última ordem de compra se existe e o valor
	client.book({ symbol: min_par, limit: 5 }).then((result) => {
		min_book = parseFloat(result.asks[0].price).toFixed(2);
		min_value_book = result.asks[0].quantity;
	});
	
	client.book({ symbol: max_par, limit: 5 }).then((result) => {
		max_book = parseFloat(result.bids[0].price).toFixed(2);
		max_value_book = result.bids[0].quantity;
	});
	
	// Determina a quantidade em cripto (BTC, LTC) a iniciar negociação conforme valor em dólar
	value_trade = (config.ORDER_VALUE / max_price).toFixed(4);
	
	// Define Percentagem de spread
	percentage_spread = parseFloat(((max_price - min_price) / min_price) * 100).toFixed(4);
	percentage_book_spread = parseFloat(((max_book - min_book) / min_book) * 100).toFixed(4);
	
	// Adiciona impostos no cálculo
	if(config.USE_BNB == 1) {
		use_bnb = 'Sim';
		percentage_spread_liquid = parseFloat(percentage_spread  - 0.15).toFixed(4);
		percentage_book_spread_liquid = parseFloat(percentage_book_spread - 0.15).toFixed(4);
	} else {
		use_bnb = 'Não';
		percentage_spread_liquid = parseFloat(percentage_spread - 0.2).toFixed(4);
		percentage_book_spread_liquid = parseFloat(percentage_book_spread - 0.2).toFixed(4);
	}


	// Verifica saldo, se positivo, se spread positivo e se existe liquidez, efetua a operação
	if(percentage_book_spread_liquid > config.PROFIT_MAKE && balance_trade >= config.ORDER_VALUE) {
		console.log("Encontrado SPREAD: "+ percentage_spread_liquid + "Entre os pares: "+ min_par +" e "+  max_par +". Verificando a liquidez!");
		if(min_value_book >= value_trade && max_value_book >= value_trade) {
			console.log("Liquidez encontrada, executando ordens a mercado para compra e venda. Lucro esperado: "+ percentage_book_spread_liquid+ "%");
			client.order({
				symbol: min_par,
				side: 'BUY',
				type: 'MARKET',
				quantity: value_trade,
				useServerTime: true
			}).then((result) => {
				console.log("ORDEM DE COMPRA EXECUTADA COM SUCESSO")
			});
			
			client.order({
				symbol: max_par,
				side: 'SELL',
				type: 'MARKET',
				quantity: value_trade,
				useServerTime: true
			}).then((result) => {
				console.log("ORDEM DE VENDA EXECUTADA COM SUCESSO")
			});
			bot.sendMessage(config.BOT_CHAT, '\u{1F4C8} Arbitragem executada com sucesso. Pares comprado: '+min_par+' Valor Comprado: '+ min_book +' Par vendido: '+max_par+' Valor Vendido: '+ max_book +' Lucro esperado: \u{1f4b5} '+ percentage_book_spread_liquid +' %');
			console.log("Aguardando 60 segundos para nova operação");
		}
	}
	
	// Console de estatísticas
	console.log("");
	console.log("UPTIME..................:", ((Math.floor(+new Date() / 1000) - startTime) / 3600).toFixed(2) , "horas");
	console.log("BNB PARA TAXAS..........:", use_bnb);
	console.log("VALOR PARA TRADE........:", value_trade);
	console.log("================ MENOR VALOR - COMPRA ===========================");
	console.log("PAR.....................:", min_par);
	console.log("VALOR...................:", min_price);
	console.log("VALOR NO BOOK...........:", min_book);
	console.log("QUANTIDADE VENDIDA......:", min_value_book);
	console.log("================ MAIOR VALOR - VENDA ============================");
	console.log("PAR.....................:", max_par);
	console.log("VALOR...................:", max_price);
	console.log("VALOR NO BOOK...........:", max_book);
	console.log("QUANTIDADE VENDIDA......:", max_value_book);
	console.log("================ PERCENTUAL NO PREÇO ============================");
	console.log("DIFERENÇA %.............:", percentage_spread);
	console.log("DIFERENÇA COM TAXAS %...:", percentage_spread_liquid);
	console.log("================ PERCENTUAL NO BOOK =============================");
	console.log("DIFERENÇA %.............:", percentage_book_spread);
	console.log("DIFERENÇA COM TAXAS %...:", percentage_book_spread_liquid);

	
	min_price = 9999999999999999999999;
	max_price = 0;

}, { scheduled: false });


// limpa o console
console.clear();
console.log("Iniciando...");
task.start();
// variaveis
min_price = 9999999999999999999999;
max_price = 0;
min_par = 0;
max_par = 0;
min_book = 0;
min_value_book = 0
max_book = 0;
max_value_book = 0;
percentage_spread = 0;
percentage_spread_liquid = 0;
percentage_book_spread = 0;
percentage_book_spread_liquid = 0;
value_trade = 0;
balance_trade = 0;
coins = ['BTCUSDT', 'BTCTUSD', 'BTCUSDC', 'BTCPAX'];
//coins = ['LTCUSDT', 'LTCUSDC', 'LTCTUSD', 'LTCPAX'];
//coins = ['ETHUSDT', 'ETHUSDC', 'ETHTUSD', 'ETHPAX'];
//coins = ['XRPUSDT', 'XRPUSDC', 'XRPTUSD', 'XRPPAX']; 
use_bnb = 'Sim';
startTime = Math.floor(+new Date() / 1000);