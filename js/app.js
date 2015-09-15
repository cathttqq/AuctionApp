(function(){
  // Setup basic AWS configuration
  AWS.config.update({
    region: appInfo.db.region,
    logger: console
  });

  var adminLoggedIn = false;

  var adminCredentials = new AWS.WebIdentityCredentials({
    RoleArn: appInfo.admin.roleArn,
    ProviderID: appInfo.admin.providerId  
  }); 

  var dbReader = new AWS.DynamoDB({params: {TableName: appInfo.db.auctionItemTableName},
                          credentials: appInfo.db.readCredentials});

  var dbWriter;
  
  //elements in index.html
  var loginButton = document.getElementById('login-button');
  var greetArea = document.getElementById('greet-area');
  var postArea = document.getElementById('post-area');
  
  //shared variable
  var userName = "Pikachu";

  function loadAuctionItems(callback){

      //TODO: load all active auction items (item.EndDate > now)

      //placeholder code for now
      var params = {
        TableName: appInfo.db.auctionItemTableName,
        Limit: 20,
        ScanFilter: {
          ItemID: {
            AttributeValueList:[{N: "00000"}],
            ComparisonOperator: "GE"
          },
          EndDate: {
            AttributeValueList: [{S: "mm/dd/yyyy"}],
            ComparisonOperator: "NE"
            }
        }
      }
      dbReader.scan(params, function(err, data){
          if (err) console.log(err, err.stack);
          else {
            var returnArray = [];
            for(var i = 0; i<data.Items.length; i++)
            {
              console.log("in for loop");
              returnArray.push(data.Items[i]);

            }
            callback(returnArray);
          }
      });

  }

  //Facebook user info
  function getUserInfo(){
    FB.api('/me', function(response) {
 
        console.log("cawa debug 2: " + response.name)
        userName = response.name;
        sessionStorage.setItem('user', response.name);
        greetArea.innerHTML = ('<h3>' + "Hello " + userName + " :-D" +'</h3>');
        });
  }

  function bidEntry(pSellInfo,pBuyerInfo, pCurrentPrice, pItemKey, pEndDate){
    var self = this;
    self.sellInfo = ko.observable(pSellInfo);
    self.buyerInfo = ko.observable(pBuyerInfo);
    self.currentPrice = ko.observable(pCurrentPrice);
    self.itemKey = ko.observable(pItemKey);
    self.endDate = ko.observable(pEndDate);
    self.latestPrice = ko.observable();
    self.renderAfterKO = function(template) {
      $(document).ready(function() {
      console.log("render after");
      console.log($('.'+self.itemKey()));
      $('#clock').countdown(self.endDate() + ' 12:00:00').on('update.countdown', function(event) {
          console.log("Generating Countdown...");
          var format = '%H:%M:%S';
          if(event.offset.days > 0) {
            format = '%-d day%!d ' + format;
          }
          if(event.offset.weeks > 0) {
            format = '%-w week%!w ' + format;
          }
          $(this).html(event.strftime(format));
      }).on('finish.countdown', function(event) {
          $(this).html('This offer has expired!');
          $(this).parent().addClass('disabled')
        });
    });
    }
}
  function AuctionViewModel(){

    var self = this;


    self.auctionItems = ko.observableArray([]);

    self.enterNewBid = function(entry){
      //test passing variable
      console.log(entry.currentPrice());
      console.log(entry.latestPrice());
      console.log(entry.itemKey());
      console.log(entry.endDate());

      //check if the new price if greater than the base price and current price
      if (parseInt(entry.latestPrice()) > parseInt(entry.currentPrice()))
      //if yes
        {
          if (adminLoggedIn){
          
          var params = {
            TableName: appInfo.db.auctionItemTableName,
            Key: {
              ItemID:{N: entry.itemKey()},
              EndDate:{S: entry.endDate()}
            },
            AttributeUpdates: {

              CurrentPrice: {
                Action: 'PUT',
                Value: {S: entry.latestPrice()}
              },
              BuyerName: {
                Action: 'PUT',
                Value: {S: userName}
              }
            }
          }

          dbWriter.updateItem(params, function(err,data){
            if(err) {   
              entry.latestPrice("");        
              return console.log(err);             
            }
            else{
              entry.buyerInfo(userName + " is bidding $" + entry.latestPrice());
              entry.latestPrice("");
            }
          });
          
        }
        else{
          alert("please login to bid");
          entry.latestPrice("");
        }

        }
      else
        {
          //prompt message saying the bid price cannot be lower than existing price
          alert("please enter a higher price :-)");
          entry.latestPrice("");
        }

        
          
    };

    loadAuctionItems(function(data){
      for (var i=0; i<data.length; i++){
        var sellInfo = data[i].SellerName.S+ " is selling " + data[i].ItemName.S+ " for $" +data[i].StartPrice.S;
        var buyerInfo;
        var currentPrice;
        if (data[i].BuyerName && data[i].CurrentPrice){
          buyerInfo = data[i].BuyerName.S + " is bidding $" + data[i].CurrentPrice.S;
          currentPrice = data[i].CurrentPrice.S;
        }
        else{
          buyerInfo = "be the first to bid on this!";
          currentPrice = data[i].StartPrice.S;
        }
        
        var itemKey = data[i].ItemID.N.toString();

        //test
        console.log("item ID: "+ itemKey);
        
        var endDateOri = data[i].EndDate.S;
        var endDate = endDateOri.substring(0,4) + '/' + endDateOri.substring(5,7) + '/' + endDateOri.substring(8,10);

        self.auctionItems.push(new bidEntry(sellInfo,buyerInfo,currentPrice,itemKey,endDate));
      }
      console.log(self.auctionItems());
    });
    


  }

  ko.applyBindings(new AuctionViewModel());

  


  // Facebook login
  window.fbAsyncInit = function() {
    FB.init({appId: appInfo.admin.appId});

    FB.getLoginStatus(function(response) {
    if (response.status === 'connected') {
      adminLoggedIn = true;
      loginButton.text = "logout";
      AWS.config.update(
          {
            credentials: new AWS.WebIdentityCredentials({
              RoleArn: appInfo.admin.roleArn,
              ProviderId: 'graph.facebook.com',
              WebIdentityToken: response.authResponse.accessToken
              })
          });

        dbWriter = new AWS.DynamoDB({
            params: {TableName: appInfo.db.auctionItemTableName}
            }); 

        getUserInfo();
      getUserInfo();
    } 
 });

    loginButton.onclick = function() {

    if(adminLoggedIn)
    {
      FB.logout();
      adminLoggedIn = false;
      loginButton.text = "login";
      greetArea.innerHTML = ('<h3>' + "Hello :-)" + '</h3>');
    }
    else{
    FB.login(function (response) {
      if (response.authResponse) { // logged in

        AWS.config.update(
          {
            credentials: new AWS.WebIdentityCredentials({
              RoleArn: appInfo.admin.roleArn,
              ProviderId: 'graph.facebook.com',
              WebIdentityToken: response.authResponse.accessToken
              })
          });

        dbWriter = new AWS.DynamoDB({
            params: {TableName: appInfo.db.auctionItemTableName}
            }); 

        getUserInfo();

        adminLoggedIn = true;
        console.log('You are now logged in.');
        loginButton.text = "logout"
      } else {
        console.log('There was a problem logging you in.');
      }
    });
  }
  };

    
  };

  // Load the SDK asynchronously
  (function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/all.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));
})();

