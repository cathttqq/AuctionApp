(function(){

  // Setup basic AWS configuration
  AWS.config.update({
    region: appInfo.db.region,
    logger: console
  });
  //html elements
  var postButton = document.getElementById('post-button');
  var greetArea2 = document.getElementById('greet-area2');
  var postingState = document.getElementById('posting-state');

  var itemName = document.getElementById('item-name');
  var startPrice = document.getElementById('start-price');
  var endingDate = document.getElementById('end-date');


  
  //variables for accessing AWS resources
  var dbwriter;

  //facebook login status
  var adminLoggedIn = false;

  function postItem(){
    // //todo: add form validation
    //return false;
    var params = {
          Item: {
            ItemID:{N: (Math.floor((Math.random() * 100000) + 1)).toString()},
            ItemName:{S: itemName.value},
            StartPrice:{S: startPrice.value},
            EndDate:{S: endingDate.value},
            SellerName:{S: sessionStorage.getItem('user')}
            }
        }


      if (!adminLoggedIn){
        alert("Please login to post items");
        return;
      }
      dbwriter.putItem(params, function (err,data){
          if(err) return console.log(err);
          postingState.innerHTML = '<h4> Your item has been posted </h4>';
          itemName.value="";
          startPrice.value="";
          endingDate.value="";
          contactNumber.value="xxx-xxx-xxxx";
      });
  }

  window.fbAsyncInit = function() {
        FB.init({
          appId : appInfo.admin.appId
        });

        FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
        AWS.config.update(
            {
            credentials: new AWS.WebIdentityCredentials({
              RoleArn: appInfo.admin.roleArn,
              ProviderId: 'graph.facebook.com',
              WebIdentityToken: response.authResponse.accessToken
              })
            }
          );

        dbwriter = new AWS.DynamoDB({
            params: {TableName: appInfo.db.auctionItemTableName},
            }); 

        adminLoggedIn = true;

      } else if (response.status === 'not_authorized') {
    // the user is logged in to Facebook, 
    // but has not authenticated your app
        adminLoggedIn = false;
      } else {
    // the user isn't logged in to Facebook.
        adminLoggedIn = false;
      }
  });
      };

      // Load the SDK asynchronously
  (function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/all.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));
  
  //update greeting text 
   //console.log(sessionStorage.getItem('user'));
    if(sessionStorage.getItem('user')){
    greetArea2.innerHTML = ('<h3>' + "Hello " + sessionStorage.getItem('user') + " :-D" +'</h3>');
    }

   postButton.addEventListener('click', postItem, false);
   
}
)();