if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};

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
var maxAmount= 20;
var minAmount= 15;
var arbitrageActive= false;

function init() {

	var pWD= ArbitrageWorker.PairWithDirection;

	var container= $("#arbitrageContainer");


//bitstamp
	var bitstampContainer= $("<div id='bitstamp'></div>");
	container.append(bitstampContainer);

	var pairsWithD= [];
	pairsWithD.push(new pWD("btceur",0));
	pairsWithD.push(new pWD("ethbtc",0));
	pairsWithD.push(new pWD("etheur",1));


	var workerContainer= $("<div>"+labelFromPairs(pairsWithD)+"</div>");
	var element= $("<div id='updates'></div>");
	bitstampContainer.append(workerContainer)
	workerContainer.append(element);
	var worker= new ArbitrageWorker(labelFromPairs(pairsWithD),new Exchanges.BitstampExchange(),pairsWithD,maxAmount,minAmount,element);

	pairsWithD= [];
	pairsWithD.push(new pWD("btceur",0));
	pairsWithD.push(new pWD("xrpbtc",0));
	pairsWithD.push(new pWD("xrpeur",1));

	workerContainer= $("<div>"+labelFromPairs(pairsWithD)+"</div>");
	element= $("<div id='updates'></div>");
	bitstampContainer.append(workerContainer)
	workerContainer.append(element);
	worker= new ArbitrageWorker(labelFromPairs(pairsWithD),new Exchanges.BitstampExchange(),pairsWithD,maxAmount,minAmount,element);

pairsWithD= [];
	pairsWithD.push(new pWD("btceur",0));
	pairsWithD.push(new pWD("ltcbtc",0));
	pairsWithD.push(new pWD("ltceur",1));

	workerContainer= $("<div>"+labelFromPairs(pairsWithD)+"</div>");
	element= $("<div id='updates'></div>");
	bitstampContainer.append(workerContainer)
	workerContainer.append(element);
	worker= new ArbitrageWorker(labelFromPairs(pairsWithD),new Exchanges.BitstampExchange(),pairsWithD,maxAmount,minAmount,element);

pairsWithD= [];
	pairsWithD.push(new pWD("btceur",0));
	pairsWithD.push(new pWD("bchbtc",0));
	pairsWithD.push(new pWD("bcheur",1));

	workerContainer= $("<div>"+labelFromPairs(pairsWithD)+"</div>");
	element= $("<div id='updates'></div>");
	bitstampContainer.append(workerContainer)
	workerContainer.append(element);
	worker= new ArbitrageWorker(labelFromPairs(pairsWithD),new Exchanges.BitstampExchange(),pairsWithD,maxAmount,minAmount,element);

}