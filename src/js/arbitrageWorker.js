(function() {


// Exchange registers for the givenPairs and reports bids and asks to the callback. 
//also provides methodes to buy/sell
    function ArbitrageWorker(label,exchange,listOfPairsWithDirections,maxAmount,minAmount,statusDiv,logDiv) {
        this.pairsWithDirections= listOfPairsWithDirections;
        this.exchange= exchange;
        this.minArbitragePercent= exchange.getTxFeePerc()*(listOfPairsWithDirections.length+1);
        this.mapOfPairs= {};
        this.orderBooks= {};
        this.statusDiv= statusDiv;
        this.maxAmount= maxAmount;
        this.minAmount= minAmount;


        var self= this;
        listOfPairsWithDirections.forEach(function(pairWithD) {
            self.mapOfPairs[pairWithD.pair]= pairWithD;
            exchange.registerForPair(pairWithD.pair,self);
        });

        this.setOrderBook= function(pair,bids,asks) {
            self.orderBooks[pair] = {bids: bids, asks:asks};
            self.checkForArbitrage();
        };

        this.getExecutions= function(startAmount,direction) {
            var inc= 1;
            var start= 0;
            if(direction == -1) {
                inc= -1;
                start= self.pairsWithDirections.length -1;
            }
            var executions= [];
            var amount= startAmount;
            for(var i= 0; i < self.pairsWithDirections.length;++i) {
                var idx= start+inc*i;
                var pwd= self.pairsWithDirections[idx];
                var quote= 1;
                var execType= pwd.direction;
                if(direction == -1) { execType= 1-pwd.direction; }

                if(execType == 0) {
                    quote= self.orderBooks[pwd.pair].asks[0].price;
                } else {
                    quote= self.orderBooks[pwd.pair].bids[0].price;
                }
                //floor
                exp= Math.pow(10,Math.floor(Math.log10(quote*0.0001)));
                var limit= quote;
                if(execType == 0) {
                    limit= Math.ceil(quote/exp)*exp;
                } else {
                    limit= Math.floor(quote/exp)*exp;
                }

                if(execType == 0) {
                    amount /= limit;
                } 
                executions.push(new Exchanges.WantedExecution(pwd.pair,execType,amount,limit));
                if(execType == 1) {
                    amount *= limit;
                }
                amount *= 1-self.exchange.getTxFeePerc()/200;               
            }
            return executions;
        }

        this.checkForArbitrage= function() {
            var gotDirection= 0;
            var value;

            var backward= 1;
            var forward= 1;
            var amountFacBack= 10000;
            var amountFacForward= 10000;
            var amountForward= 1;
            var amountBackward= 1;
            //backward
            self.pairsWithDirections.forEach(function(pairWithD) {
                var quoteBuy= 0;
                var quoteSell= 0;
                var maxAmountBuy= 0;
                var maxAmountSell= 0;
                if(self.orderBooks[pairWithD.pair]) {
                        quoteBuy= 1/self.orderBooks[pairWithD.pair].asks[0].price;
                        maxAmountBuy= self.orderBooks[pairWithD.pair].asks[0].amount/quoteBuy;
                        quoteSell= self.orderBooks[pairWithD.pair].bids[0].price;
                        maxAmountSell= self.orderBooks[pairWithD.pair].bids[0].amount;
                }
                var facForward;
                var facBackward;

                if(pairWithD.direction == 0) {
                    facForward= maxAmountBuy/forward;
                    forward *=quoteBuy;
                    backward *=quoteSell;
                } else {
                    facForward= maxAmountSell/forward;
                    forward *=quoteSell;
                    backward *=quoteBuy;
                }
                if(facForward < amountFacForward) {
                    amountFacForward= facForward;
                }
            });
            var back1= backward;
            backward= 1;
            //need to calc maxAmount backward seperatly
            for(var i= self.pairsWithDirections.length-1;i >= 0;--i) {
                var pairWithD= self.pairsWithDirections[i];
                var quoteBuy= 0;
                var quoteSell= 0;
                var maxAmountBuy= 0;
                var maxAmountSell= 0;
                if(self.orderBooks[pairWithD.pair]) {
                        quoteBuy= 1/self.orderBooks[pairWithD.pair].asks[0].price;
                        maxAmountBuy= self.orderBooks[pairWithD.pair].asks[0].amount/quoteBuy;
                        quoteSell= self.orderBooks[pairWithD.pair].bids[0].price;
                        maxAmountSell= self.orderBooks[pairWithD.pair].bids[0].amount;
                }
                var facBackward;

                if(pairWithD.direction == 0) {
                    facBackward= maxAmountSell/backward;
                    backward *=quoteSell;
                } else {
                    facBackward= maxAmountBuy/backward;
                    backward *=quoteBuy;
                }
                if(facBackward < amountFacBack) {
                    amountFacBack= facBackward;
                }
            }
            var gotOne= "";
            var executions= [];
            if(backward > 1+self.minArbitragePercent/100) {
                if(Date.now() < self.cooldown) {
                    console.log("cooldown");
                    return;
                }
                self.cooldown= Date.now()+5000;
                console.log(label+" got arbitrage backwards: "+backward+" with "+amountFacBack);
                if(amountFacBack < self.minAmount) {
                    console.log("not enough volume");
                    return;
                }   
                executions= self.getExecutions(Math.min(amountFacBack,self.maxAmount),-1);
                exchange.executeOrderChain(executions,function(success,message) { 
                    //add log
                    var element= $("<div>"+label+":"+(success?"SUCCESS":"PROBLEM")+" doing train: "+message+"</div>");
                    logDiv.append(element);    
                });
                gotOne= " got arbitrage: backward";
            }   
            if(forward > 1+self.minArbitragePercent/100) {
                 if(Date.now() < self.cooldown) {
                    console.log("cooldown");
                    return;
                }   
                self.cooldown= Date.now()+5000;
                console.log(label+" got arbitrage forwards: "+forward+" with "+amountFacForward);
                if(amountFacForward < self.minAmount) {
                    console.log("not enough volume");
                    return;
                } 
                executions= self.getExecutions(Math.min(amountFacForward,self.maxAmount),1);
                exchange.executeOrderChain(executions, function(success,message) { 
                    //add log
                    var element= $("<div>"+label+":"+(success?"SUCCESS":"PROBLEM")+" doing train: "+message+"</div>");
                    logDiv.append(element);    
                });
                gotOne= " got arbitrage: forward";               
            }            

            self.statusDiv.html((arbitrageActive?"active:":"paused:")+" forward: "+forward.toFixed(4)+" backward:"+backward.toFixed(4)+gotOne);
        };
    }

//0 for buy, 1 for sell
    ArbitrageWorker.PairWithDirection = function(pair,direction) {
        this.pair= pair;
        this.direction= direction;
    };

    window.ArbitrageWorker= ArbitrageWorker;

}());