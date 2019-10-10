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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function wait_sell() {
  console.log('Aguardando 3 segundos para execução da venda');
  await sleep(3);
}

var task = cron.schedule('*/' + config.LOOP_TIME + ' * * * * *', () => {
	// Limpa o console
	console.clear();

	// Verifica o saldo para compras e iniciar a negociação e remove da negociação valores zerados
	// Caso o valor seja zerado, remove dos pares de compra. Caso volte valor ao par, adiciona para negociar
	client.accountInfo({ useServerTime: true }).then((result) => {
		for (let index = 0; index < result.balances.length; index++) {
			let check = coins_min.indexOf(result.balances[index].asset)
			if(coins_min.indexOf(result.balances[index].asset) != -1) {
				if(result.balances[index].free < config.ORDER_VALUE) {
					let index_coin = coins_min.findIndex(coins_min => coins_min === result.balances[index].asset);
					coins_min.splice(index_coin, 1);
				} 
			}
			if(coins_min.indexOf(result.balances[index].asset) == -1 && coins_max.indexOf(result.balances[index].asset) != -1 ) {
				if(result.balances[index].free > config.ORDER_VALUE) {
					coins_min.push(result.balances[index].asset);
				}
			}
		}
	});

	
	// Verifica, através do boook de ofertas a ordem de compra que atende os requisitos:
	// Diferença de valor conforme o make_profit
	// Valor vendido, se atende a demanda de compra e venda
	for (let i=0; i<coins_min.length; i++) {
		client.book({ symbol: config.MARKET + coins_min[i], limit: 5 }).then((result) => {
			let value_book  = parseFloat(result.asks[0].price).toFixed(2);
			if(value_book < min_price) {
				min_price = value_book;
				min_par = config.MARKET + coins_min[i];
				currency_min_par = coins_min[i];
				min_book = parseFloat(result.asks[0].price).toFixed(2);
				min_value_book = result.asks[0].quantity;
			}
		});
	}

	for (let i=0; i<coins_max.length; i++) {
		client.book({ symbol: config.MARKET + coins_max[i], limit: 5 }).then((result) => {
			let value_book = parseFloat(result.bids[0].price).toFixed(2);
			if(value_book > max_price) {
				max_price = value_book;
				max_par = config.MARKET + coins_max[i];
				max_book = parseFloat(result.bids[0].price).toFixed(2);
				max_value_book = result.bids[0].quantity;
			}
		});
	}
	
		
	// Determina a quantidade em cripto (BTC, LTC) a iniciar negociação conforme valor em dólar
	value_trade = (config.ORDER_VALUE / max_price).toFixed(4);

	
	// Define Percentagem de spread
	percentage_spread = parseFloat(((max_price - min_price) / min_price) * 100).toFixed(4);
	percentage_book_spread = parseFloat(((max_book - min_book) / min_book) * 100).toFixed(4);
	
	// Adiciona impostos no cálculo (0.075 * 2 ou 0.1 * 2 sem bnb) pois são duas ordens necessárias
	if(config.BNB_FEES == 1) {
		use_bnb = 'Sim';
		percentage_spread_liquid = parseFloat(percentage_spread  - 0.15).toFixed(4);
		percentage_book_spread_liquid = parseFloat(percentage_book_spread - 0.15).toFixed(4);
	} else {
		use_bnb = 'Não';
		percentage_spread_liquid = parseFloat(percentage_spread - 0.2).toFixed(4);
		percentage_book_spread_liquid = parseFloat(percentage_book_spread - 0.2).toFixed(4);
	}
	
	

	// Verifica saldo, se positivo, se spread positivo e se existe liquidez, efetua a operação
	if(percentage_book_spread_liquid > config.PROFIT_MAKE) {
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
				wait_sell();
				client.order({
					symbol: max_par,
					side: 'SELL',
					type: 'MARKET',
					quantity: value_trade,
					useServerTime: true
				}).then((result) => {
					bot.sendMessage(config.BOT_CHAT, '\u{1F4C8} Arbitragem executada com sucesso. Pares comprado: '+min_par+' Valor Comprado: '+ min_book +' Par vendido: '+max_par+' Valor Vendido: '+ max_book +' Lucro esperado: \u{1f4b5} '+ percentage_book_spread_liquid +'% Lucro da operação: '+ parseFloat(((max_book - min_book) / min_book) * 100).toFixed(2)+'%');
					console.log("ORDEM DE VENDA EXECUTADA COM SUCESSO")
				}).catch((err) => {
					console.log("ERRO ORDEM NA ORDEM DE VENDA")
					error_buy = 1;
     			});
			}).catch((err) => {
				console.log("ERRO ORDEM NA ORDEM DE COMPRA")
     		});
		}
	}
	
	// Console de estatísticas
	console.log("===== ARBITRAGE BOT ====");
	console.log("UPTIME..................:", ((Math.floor(+new Date() / 1000) - startTime) / 3600).toFixed(2) , "horas");
	console.log("BNB PARA TAXAS..........:", use_bnb);
	console.log("VALOR PARA TRADE........:", value_trade);
	console.log("================ MENOR VALOR - COMPRA ===========================");
	console.log("PAR.....................:", min_par);
	console.log("VALOR NO BOOK...........:", min_book);
	console.log("QUANTIDADE VENDIDA......:", min_value_book);
	console.log("================ MAIOR VALOR - VENDA ============================");
	console.log("PAR.....................:", max_par);
	console.log("VALOR NO BOOK...........:", max_book);
	console.log("QUANTIDADE VENDIDA......:", max_value_book);
	console.log("================ PERCENTUAL NO BOOK =============================");
	console.log("DIFERENÇA %.............:", percentage_book_spread);
	console.log("DIFERENÇA COM TAXAS %...:", percentage_book_spread_liquid);

	// reseta contadores
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
coins_min = ['USDT', 'TUSD', 'USDC', 'PAX', 'BUSD', 'USDS'];
coins_max = ['USDT', 'TUSD', 'USDC', 'PAX', 'BUSD', 'USDS'];
startTime = Math.floor(+new Date() / 1000);