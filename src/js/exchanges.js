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

    function ExchangeExecuter(exchange) {
        this.exchange= exchange;  
        this.lock= function() {
            var result= !self.locked;
            if(result) {
                self.locked= true;
            }
            return result;
        }
        this.unlock= function() {
            self.locked= false;
        }

        var self= this;

        this.handleErrorInChain= function(pendingOrder,listOfExecutions,exec,callback,doMarket) {
            //clean up
            console.warn("error in Train @ "+exec.pair+" pending Order: "+pendingOrder);
            if(pendingOrder > 0) {
                self.exchange.cancelOrder(pendingOrder,
                    function(data) { 
                        if(data.id != pendingOrder) { //error canceling -> continue executions
                            self.executeOrderChainRecursive(listOfExecutions,callback)
                        } else {
                            if(exec.pair.substr(3,6) == "eur" && exec.type == 0) {
                                //wanted to buy for eur -> nothing to do
                                callback(false,"Couldnt execute first order");                                       
                            } else {
                                //close position
                                var newPair,amount,type, limit;
                                if(exec.type == 0) {
                                    //wanted to buy
                                     newPair= exec.pair.substr(3,6)+"eur";
                                     amount= exec.amount/exec.price;
                                    type= "sell";
                                    limit= self.exchange.orderBook[newPair].asks[0].price*0.99;
                                } else {
                                    newPair= exec.pair.substr(0,3)+"eur";
                                    amount= exec.amount;
                                    type= "buy";
                                    limit= self.exchange.orderBook[newPair].bids[0].price*1.01;
                                }
                                if(!doMarket) {
                                    self.exchange.sendLimit(type,newPair,amount,limit,
                                        function() {callback(false,"There were "+(listOfExecutions.length+1)+" unsatisfied executions, closed position");},
                                        function(pendingOrder) {self.handleErrorInChain(pendingOrder,listOfExecutions,exec,callback,true);});
                                } else {
                                    self.exchange.sendMarket(type,newPair,amount,
                                        function() {callback(false,"There were "+(listOfExecutions.length+1)+" unsatisfied executions, closed position market");}
                                        );
                                }                                            
                                callback(false,"There were "+(listOfExecutions.length+1)+" unsatisfied executions, closed position");
                            }
                        }
                    });
            } else {
                //order not even opened -> no idea what to do: cancel
                arbitrageActive= false;
                callback(false,"There were "+(listOfExecutions.length+1)+" unsatisfied executions, with major error")
            }
        }

        this.executeOrderChain= function(listOfExecutions,callback) {
            if(!self.lock()) {
                 console.log("Exchange already locked");
                return;
            }
            self.executeOrderChainRecursive(listOfExecutions,
                function(success,message) { callback(success,message); self.unlock();});
        };
        
        this.executeOrderChainRecursive= function(remainingExecutions,callback) {
            if(remainingExecutions.length > 0) {                
                var exec= remainingExecutions[0];
                remainingExecutions.shift();
                self.exchange.sendLimit(exec.type==0?"buy":"sell",exec.pair,exec.amount,exec.price,
                    function() {self.executeOrderChainRecursive(remainingExecutions,callback);},
                    function(pendingOrder) {self.handleErrorInChain(pendingOrder,remainingExecutions,exec,callback,false);}
                    );
            } else {
                console.log("done arbitrage Train");
                callback(true,"");
            }
        };
    }

    var bitstampNonce= 1;
// Exchange registers for the givenPairs and reports bids and asks to the callback. 
//also provides methodes to buy/sell
    function BitstampExchange() {
        this.executer= new ExchangeExecuter(this);
        this.locked= false;
        this.pusher = new Pusher('de504dc5763aeef9ff52');
        this.orderBook= {};
        var self= this;
        this.getTxFeePerc = function() { return 0.25; };

        this.generateSignature= function(nonce) {
            var content= nonce+bitstampAuth.userId+bitstampAuth.apiKey;

            var shaObj = new jsSHA("SHA-256", "TEXT");
            shaObj.setHMACKey(bitstampAuth.secret, "TEXT");
            shaObj.update(content);
            return shaObj.getHMAC("HEX").toUpperCase();
        };
        this.lock= function() {
            var result= !self.locked;
            if(result) {
                self.locked= true;
            }
            return result;
        }
        this.unlock= function() {
            self.locked= false;
        }

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
                    debugger;
                    console.error("error calling api "+JSON.stringify(e));
                }
            });
            bitstampNonce += 1;
        };

        this.sendMarket= function(type,pair,amount,callback) {
            amount= Number(amount.toFixed(8)); //restrict to 8 decimals
            if(pair.indexOf("eur") != -1) {
                limit= Number(limit.toFixed(5)); //restrict to 5 decimals
            } else {
                limit= Number(limit.toFixed(8)); //restrict to 5 decimals
            }
            if(!arbitrageActive) {
                console.log("would "+type+" "+pair+" "+amount);
                callback();
                return;
            }      
            console.log(Date.now() + " sending market order "+type+" "+amount+" in "+pair);
            self.callAPI("https://www.bitstamp.net/api/v2/"+type+"/market/"+pair+"/",function(data) {
                if(data.status == "error") {
                    console.error("error with market:"+JSON.stringify(data.reason));
                    alert("error in market order!");
                    arbitrageActive= false;
                }
                callback();
              },
            {amount:amount});
        };

        this.sendLimit= function(type,pair,amount,limit,callbackIfDone,errorCallback) { 
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
            console.log(Date.now() + " sending limit order "+type+" "+amount+"@"+limit+" in "+pair);
            self.callAPI("https://www.bitstamp.net/api/v2/"+type+"/"+pair+"/",function(data) {
                if(data.status == "error") {
                    console.error("erro with limit:"+JSON.stringify(data.reason));
                    alert("error in order!");
                    errorCallback(0);
                } else {
                    self.checkConfirmation(7,data.id,pair,callbackIfDone,errorCallback);
                }
              },
            {amount:amount, price:limit});
        };

        this.checkConfirmation= function(retries,orderId,pair,callbackIfDone,errorCallback) {
            self.callAPI("https://www.bitstamp.net/api/order_status/",
                function(data) { 
                    if(data.status != "Finished") {
                        if(retries > 0) {
                           console.warn(Date.now() + " order "+orderId +" in "+pair+" is still pending! retry");
                           setTimeout(function(){self.checkConfirmation(retries-1,orderId,pair,callbackIfDone,errorCallback)},200*(8-retries)*(8-retries));
                        } else {
                            console.error(Date.now() + " order "+orderId+" in "+pair+" is still pending, cancelling");
                            errorCallback(orderId);
                        }
                    } else {
                        console.log("done order "+orderId+" in "+pair);
                        callbackIfDone();
                    }
                },
                {id:orderId});
        };

        this.cancelOrder= function(orderId,callback) {
            self.callAPI("https://www.bitstamp.net/api/v2/cancel_order/",callback,
                    {id:orderId});
        }

        this.executeOrderChain= function(listOfExecutions,callback) {
            this.executer.executeOrderChain(listOfExecutions,callback);
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
                self.orderBook[pair]= {bids:bids,asks:asks};
                self.listenersForPair[pair].forEach(function(callback) {
                    callback.setOrderBook(pair,bids,asks);
                });
            });
        }

    }
     
    Exchanges.BitstampExchange = BitstampExchange;

    window.Exchanges= Exchanges;

}());