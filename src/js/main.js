if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function labelFromPairs(pairs) {
	var label= "";
	pairs.forEach(function(p) {
		if(p.direction == 1) {
			label+= p.pair.substr(0,p.pair.length/2);
		} else {
			label += p.pair.substr(p.pair.length/2,p.pair.length);
		}
		label+= "-";
	});
	var p= pairs.last();
	if(p.direction == 1) {
		label+= p.pair.substr(p.pair.length/2,p.pair.length);
	} else {
		label += p.pair.substr(0,p.pair.length/2);
	}
	return label.toUpperCase();
}

	var ex= new Exchanges.BitstampExchange();
var workers= [];
var maxAmount= 90;
var minAmount= 70;
var arbitrageActive= false;

function addThreeSomeBitstamp(middle,ex,bitstampContainer,logContainer) {
	var pWD= ArbitrageWorker.PairWithDirection;
	var pairsWithD= [];
	pairsWithD.push(new pWD("btceur",0));
	pairsWithD.push(new pWD(middle+"btc",0));
	pairsWithD.push(new pWD(middle+"eur",1));


	var workerContainer= $("<div>"+labelFromPairs(pairsWithD)+"</div>");
	var element= $("<div id='updates'></div>");
	bitstampContainer.append(workerContainer)
	workerContainer.append(element);
	var worker= new ArbitrageWorker(labelFromPairs(pairsWithD),ex,pairsWithD,maxAmount,minAmount,element,logContainer);


	pairsWithD= [];
	pairsWithD.push(new pWD("eurusd",1));
	pairsWithD.push(new pWD(middle+"usd",0));
	pairsWithD.push(new pWD(middle+"eur",1));


	workerContainer= $("<div>"+labelFromPairs(pairsWithD)+"</div>");
	element= $("<div id='updates'></div>");
	bitstampContainer.append(workerContainer)
	workerContainer.append(element);
	worker= new ArbitrageWorker(labelFromPairs(pairsWithD),ex,pairsWithD,maxAmount,minAmount,element,logContainer);
}

function hideExchangeChoice() {
	$("#exchangeChoice").hide();
}

function init() {
	var exchange= getParameterByName("exchange");
	if(exchange == "bitstamp") {
		initBitstamp();
		arbitrageActive= getParameterByName("activate") == "true";
	}
}

function initBitstamp() {
	hideExchangeChoice();

	var container= $("#arbitrageContainer");
	var logContainer= $("#logs");

	var ex= new Exchanges.BitstampExchange();

	addThreeSomeBitstamp("eth",ex,container,logContainer);
	addThreeSomeBitstamp("xrp",ex,container,logContainer);
	addThreeSomeBitstamp("ltc",ex,container,logContainer);
	addThreeSomeBitstamp("bch",ex,container,logContainer);

	var pWD= ArbitrageWorker.PairWithDirection;
	var pairsWithD= [];
	pairsWithD.push(new pWD("eurusd",1));
	pairsWithD.push(new pWD("btcusd",0));
	pairsWithD.push(new pWD("btceur",1));


	var workerContainer= $("<div>"+labelFromPairs(pairsWithD)+"</div>");
	var element= $("<div id='updates'></div>");
	container.append(workerContainer)
	workerContainer.append(element);
	var worker= new ArbitrageWorker(labelFromPairs(pairsWithD),ex,pairsWithD,maxAmount,minAmount,element,logContainer);

}