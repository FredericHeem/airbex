Snow api brush test. 
=====

The objective of this subproject is to fill our order book based on other exchanges order books.

The actors: 
 * The exchange that needs liquidity: SBEX
 * The exchange that has liquidity: Bitstamp
 * Maker makers: entity that provides liquidity to SBX from Bitstamp.
   Market makers has accounts and liquity on both accounts and manage the bank transfer from these accounts 
 * Users of SBEX that wants *instant* buy or sell

Le's suppose the Bitstamp BTC/USD orderbook is as follow:
Someone want to buy 3BTC@990$ and another who want to buy 2BTC@980$
On the other side, someone is willing to sell 4BTC@1000$ and another who wants to sell 5BTC@1010$
 
 bitstamp_bids = [["990.00", "3"], ["980.00", "2"]];
 bitstamp_ask = [["1000.00", "4"], ["1010.00", "5"]];
 
Let's call Mamak someone who is willing to operate as a maker maker. 

== Users Buying BTC on SBEX

Suppose Mamak has 5000$@Bitstamp and 6BTC@SBEX
Mamak is ready to make some offer to sell BTC at a certain price at SBEX depending on the Bitstamp price.  
When a Mamak sells BTC on SBEX, he has to buy back the BTC at Bitstamp, so he looks for the seller, i.e "bitstamp_ask".
Suppose Mamak requires 5% margin to :
* provide this service.
* pay for the bitstamp trading fees
* pay for the sbex trading fees
* pay the bank deposit and withdraw fees
* pay the BTC sending feed, no fee to receive BTC.
* cover the risk: counter party risk for bitstamp and sbex, BTC volatility, human errors

Here is what Mamak can offer at SBEX:
mamak_ask = [["1050.00", "4"], ["1060.00", "5"]];

Wait a minute, Mamak cannot offer 4BTC@1050 and 5BTC@1050, he cannot offer 4 + 5 = 9 BTC because he has only 6 BTC@SBX, 
Mamak needs to reduce the amount of the offers:

mamak_ask = [["1050.00", "4"], ["1060.00", "2"]];

Alice registers to SBEX and deposit 5000USD. Alice can now buy some BTC. 
This is the case where there is enough offer for Alice, she buy 4BTC@1050 = 4200$ and it remains 5000 - 4200 = 800$
But now she can buy 1060$ per BTC, so she can buy 800/1060 = 0.7547 BTC
In total, she gets 4 + 0.7547 = 4.7547 BTC for 5000USD, so an average price of 5000 / 4.7547 = 1051.59$/BTC
It sounds correct because it is between 1050 and 1060.
After the deals, Mamak has the following position:
5000$ (from Alice) and 6 - 4.7547 = 1.2452 BTC

Hurry up, Mamak is running out of BTC on SBEX so he has to immediately buy the 4.7547 BTC @Bitstamp where the ask is:
 bitstamp_ask = [["1000.00", "4"], ["1010.00", "5"]];
 
Mamak is in front of 2 situations:
* Mamak buys back the exact quantiy of BTC he sold on SBEX, i.e 4.7547 BTC
Mamak buy 1000*4 = 4000$  and want 0.7547 BTC for 1010$, so 1010/0.7547 = 762.24$ 
so for 4000 + 762.24 = 4762.24$ he gets 4.7547 BTC. 
Remaining $ balance at Bitstamp is 5000 - 4762.24 = 237$ and 0BTC
* Mamak buys the amount of $ he received from SBEX, i.e 5000$, instead of buying for 4762.24$, 
he can buy for 5000$ and buys BTC.
4000$ @1000$/BTC, 1000$ @1010/BTC  = 0.99 BTC, so 4.99 BTC @Bitstamp and 0 $@Bitstamp
Profit in BTC is now 4.99 - 4.7547 = 0.24 BTC with is roughly equal to 237$.  


At the begining of the process, Mamak has $ @Bitstamp and BTC@SBEX, now he has USD@SBEX and BTC@Bitstamp.


== Users Selling BTC on SBEX
Bob comes to SBEX and would like to sell his BTC to get some USD.
So Mamek will put some bids to buy these BTC for some USD he has on SBEX.
To do the deal, he should have some BTC@Bitstamp he sells higher for some USD.
To sell BTC@Bitstamp, he looks for Bitstamp bids:
    bitstamp_bids = [["990.00", "3"], ["980.00", "2"]];
Suppose 5% margin, Mamak bids@SBEX should be:
    sbex_bids_mamak = [["940.00", "3"], ["931.00", "2"]];

Bob wants to sell 4BTC, 3BTC@940$ + 1BTC@931$ = 3751$. 
This suppose Mamak has at leat 3751$SBEX. Suppose now that Mamak ha only 3000$@SBEX, 
Let's find out the possible bids for Mamak:
He can buy 3TBC@940 = 2820$, he has left 3000 - 2820 $ = 180$ to buy up to 2 BTC@931$. 
sbex_bids_mamak = [["940.00", "3"], ["931.00", "180/931"]];






    
    








 









Requirements.
---

The snow api server and its database must be up and running. 
 

Install mocha, a testing framework:

```
npm install -g mocha
```

Edit the configuration file `test/config/config.json`  

Run all tests:
----
```
mocha
```

Run tests matching the name Markets:
---
```
mocha -g Markets
```

