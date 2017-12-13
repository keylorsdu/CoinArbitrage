(function() {
var Exchanges= {};

    function Level2Entry(price,amount) {
        this.price= Number(price);
        this.amount= Number(amount);
    }

    Exchanges.Level2Entry= Level2Entry;

    function WantedExecution(pair,type,amount,price) {
        this.pair= pair;
        this.type= type;
        this.amount= amount;
        this.price= price;
    }
    Exchanges.WantedExecution= WantedExecution;

    var bitstampNonce= 1;
// Exchange registers for the givenPairs and reports bids and asks to the callback. 
//also provides methodes to buy/sell
    function BitstampExchange() {
        this.pusher = new Pusher('de504dc5763aeef9ff52');
        var self= this;
        this.getTxFeePerc = function() { return 0.25; };

        this.generateSignature= function(nonce) {
            var content= nonce+bitstampAuth.userId+bitstampAuth.apiKey;

            var shaObj = new jsSHA("SHA-256", "TEXT");
            shaObj.setHMACKey(bitstampAuth.secret, "TEXT");
            shaObj.update(content);
            return shaObj.getHMAC("HEX").toUpperCase();
        };

        this.callAPI= function(endpoint, callback, data) {
            var nonce= Date.now()*100+bitstampNonce%100;
            data= data || {};
            data.key= bitstampAuth.apiKey;
            data.signature=self.generateSignature(nonce);
            data.nonce=nonce;
            $.ajax({ 
                type: 'POST', 
                url: endpoint, 
                data: data,
                success: callback,
                error: function(e) {
                    console.error("error calling api "+e);
                }
            });
            bitstampNonce += 1;
        };

        this.sendOrder= function(type,pair,amount,limit,callbackIfDone) { 
            console.log("orderInput "+type+" "+pair+" "+amount+" @ "+limit);
            amount= Number(amount.toFixed(8)); //restrict to 8 decimals
            if(pair.indexOf("eur") != -1) {
                limit= Number(limit.toFixed(5)); //restrict to 5 decimals
            } else {
                limit= Number(limit.toFixed(8)); //restrict to 5 decimals
            }
            if(!arbitrageActive) {
                console.log("would "+type+" "+pair+" "+amount+" @ "+limit);
                callbackIfDone();
                return;
            }      
            console.log(Date.now() + " sending order "+type+" "+amount+"@"+limit+" in "+pair);
            self.callAPI("https://www.bitstamp.net/api/v2/"+type+"/"+pair+"/",function(data) {
                if(data.status == "error") {
                    console.error("error:"+JSON.stringify(data.reason));
                    alert("error in order!");
                    arbitrageActive= false;
                } else {
                    self.checkConfirmation(7,data.id,pair,callbackIfDone);
                }
              },
            {amount:amount, price:limit});
        };

        this.checkConfirmation= function(retries,orderId,pair,callbackIfDone) {
            self.callAPI("https://www.bitstamp.net/api/order_status/",
                function(data) { 
                    if(data.status != "Finished") {
                        if(retries > 0) {
                           console.warn(Date.now() + " order "+orderId +" in "+pair+" is still pending! retry");
                           setTimeout(function(){self.checkConfirmation(retries-1,orderId,pair,callbackIfDone)},200*(8-retries)*(8-retries));
                        } else {
                            console.error(Date.now() + " order "+orderId+" in "+pair+" is still pending!");
                            alert("order in "+pair+" is still pending!");
                            arbitrageActive= false;
                        }
                    } else {
                        console.log("done order "+orderId+" in "+pair);
                        callbackIfDone();
                    }
                },
                {id:orderId});
        }


        this.buy= function(pair,amount,limit,callbackIfDone) {
            this.sendOrder("buy",pair,amount,limit,callbackIfDone);
        };
        this.sell= function(pair,amount,limit,callbackIfDone) { 
            this.sendOrder("sell",pair,amount,limit,callbackIfDone);
        };

        this.executeOrderChain= function(listOfExecutions) {
            if(listOfExecutions.length > 0) {
                var exec= listOfExecutions[0];
                listOfExecutions.shift();
                self.sendOrder(exec.type==0?"buy":"sell",exec.pair,exec.amount,exec.price,function() {self.executeOrderChain(listOfExecutions);})
            } else {
                console.log("done arbitrage Train");
            }
        };

        this.listenersForPair= {};
        this.registerForPair= function(pair,callback) {
            if(self.listenersForPair[pair] !== undefined) {
                self.listenersForPair[pair].push(callback);
                return;
            } 
            self.listenersForPair[pair]= [];
            self.listenersForPair[pair].push(callback);
            var addOn= "";
            if(pair != "btcusd") {
                addOn= "_"+pair;
            }
            var orderBookChannel = self.pusher.subscribe('order_book'+addOn);
            orderBookChannel.bind('data', function (data) {
                var bids= [];
                data.bids.forEach(function(bid) {
                    bids[bids.length]= new Level2Entry(bid[0],bid[1]);
                });
                var asks= [];
                data.asks.forEach(function(ask) {
                    asks[asks.length]= new Level2Entry(ask[0],ask[1]);
                });
                self.listenersForPair[pair].forEach(function(callback) {
                    callback.setOrderBook(pair,bids,asks);
                });
            });
        }

    }
     
    Exchanges.BitstampExchange = BitstampExchange;

    window.Exchanges= Exchanges;

}());