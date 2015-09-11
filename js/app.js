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
  var userName = "";

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
 
        userName = response.name;
        sessionStorage.setItem('user', response.name);
        greetArea.innerHTML = ('<h3>' + "Hello " + userName + " :-D" +'</h3>');
        });
  }

  function bidEntry(pSellInfo, pContactInfo, pBuyerInfo, pCurrentPrice, pItemKey, pEndDate){
    this.sellInfo = ko.observable(pSellInfo);
    this.buyerInfo = ko.observable(pBuyerInfo);
    this.contactInfo = ko.observable(pContactInfo);
    this.currentPrice = ko.observable(pCurrentPrice);
    this.itemKey = ko.observable(pItemKey);
    this.endDate = ko.observable(pEndDate);
    this.latestPrice = ko.observable();
  }

  function AuctionViewModel(){
    var self = this;

    self.auctionItems = ko.observableArray([]);

    self.enterNewBid = function(entry){


      //check if the new price if greater than the base price and current price
      if (parseInt(entry.latestPrice()) > parseInt(entry.currentPrice()))
      //if yes
        {
          if (adminLoggedIn){
          //TODO: update database with current latest price and buyer name
          
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
        var sellInfo = data[i].SellerName.S+ " is selling " + data[i].ItemName.S+ " for $" +data[i].StartPrice.S 
        var contactInfo = "Contact " + data[i].ContactNumber.S +" for more details";
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

        
        var endDate = data[i].EndDate.S;

        self.auctionItems.push(new bidEntry(sellInfo,contactInfo,buyerInfo,currentPrice,itemKey,endDate));
      }
    
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

        loginButton.text = "logout"
      } else {
 
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

  //loginButton.addEventListener('click', adminLogin, false);
  //loadAuctionItems();


})();

