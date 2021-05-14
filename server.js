const express = require('express');
const app = express();
var path = require('path');
const { v4: uuidv4 } = require('uuid');
//Blockchain Configuration
const BigchainDB = require('bigchaindb-driver')
const bip39 = require('bip39')
const API_PATH = 'https://test.ipdb.io/api/v1/'
const conn = new BigchainDB.Connection(API_PATH)
var session = require('express-session');

app.use(express.json()); // To read post requests
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1) // trust first proxy

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static('views'));
var ssn;

app.get('/',function(req,res) { 
  ssn = req.session; 
  if(ssn.email) {
    res.render('land');
  } else {
    res.render('home');
  }
});

app.get('/account',function(req,res) { 
  
  res.render('index');
});

app.get('/addRecord',function(req,res) { 
  
  res.render('addRecord');
});

app.get('/queryTool',function(req,res) { 
  
  res.render('queryTool');
});

app.get('/updateRecord',function(req,res) { 
  
  res.render('updateRecord');
});


app.post('/login',function(req,res){
  ssn = req.session;
  ssn.email=req.body.email;
  console.log(req.body);
  res.render('land');
});


app.get('/logout',function(req,res){
  req.session.destroy(function(err) {
    if(err) {
      console.log(err);
    } else {
      res.redirect('/');
    }
  });
});


/* 
   Input : seedPhrase
   Output: privatekey and publickey as json
   Description : Function to create key pair for user
*/
app.post('/register',async (req,res)=>{

    // USer Creation
    try{ 

    const seed = await (await bip39.mnemonicToSeed(req.body.mnemonic)).slice(0,32);
    const user = await new BigchainDB.Ed25519Keypair(seed);
    //Returns Private and Public Key
    console.log(user); 
    res.render('land');
    
    }
    catch(err){
      
      res.render('index');
    }
    
});


app.post('/addRecord',async (req,res)=>{


  try{
  const land = {
    landID : uuidv4(),
    buyer: req.body.buyer,
    seller: req.body.seller,
    inspector: req.body.inspector,
    latitude: req.body.lat,
    longitude : req.body.long,
    address : req.body.address,
    distance : req.body.distance
    }
    console.log(land);

    const seed = await (await bip39.mnemonicToSeed('seedPhrase')).slice(0,32);
    const alice =  new BigchainDB.Ed25519Keypair(seed)
    // Construct a transaction payload
    const txCreateLand = await BigchainDB.Transaction.makeCreateTransaction(
          // Asset field
          {
              land,
          },
          // Metadata field, contains information about the transaction itself
          // (can be `null` if not needed)
          {
              datetime: new Date().toString(),
              location: 'Chennai',
              value: {
                  value_eur: '25000000€',
                  value_btc: '2200',
              }
          },
          // Output. For this case we create a simple Ed25519 condition
          [BigchainDB.Transaction.makeOutput(
              BigchainDB.Transaction.makeEd25519Condition(alice.publicKey))],
          // Issuers
          alice.publicKey
      )
      // The owner of the painting signs the transaction
      const txSigned = BigchainDB.Transaction.signTransaction(txCreateLand,
          alice.privateKey)
  
      // Send the transaction off to BigchainDB
      conn.postTransactionCommit(txSigned)
          .then(a => {
            console.log(a);
              res.json({
               id: txSigned.id,
               msg: 'Successful'
              });
              // txSigned.id corresponds to the asset id of the painting
          })
  }
  catch(err){
    console.log(err);
    res.json({
      id: '!',
      msg: 'Error in transaction'
     });
  }


});

app.post('/updateRecord',async (req,res)=>{

  console.log(req.body);
  const seed = await (await bip39.mnemonicToSeed('seedPhrase1')).slice(0,32);
  const seed2 = await (await bip39.mnemonicToSeed('seedPhrase')).slice(0,32);
  const alice =  new BigchainDB.Ed25519Keypair(seed)
  const newOwner =  new BigchainDB.Ed25519Keypair(seed2)
  const txCreatedID =req.body.landid;
    // Get transaction payload by ID
  // const d = await transferOwnership(txCreatedID,newOwner,alice);
  // console.log(d);
  // res.send(d);

  conn.getTransaction(txCreatedID)
      .then((txCreated) => {
          const createTranfer = BigchainDB.Transaction.
          makeTransferTransaction(
              // The output index 0 is the one that is being spent
              [{
                  tx: txCreated,
                  output_index: 0
              }],
              [BigchainDB.Transaction.makeOutput(
                  BigchainDB.Transaction.makeEd25519Condition(
                      newOwner.publicKey))],
              {
                  datetime: new Date().toString(),
                  value: {
                      value_eur: '30000000€',
                      value_btc: '2100',
                  }
              }
          )
          // Sign with the key of the owner of the painting (Alice)
          const signedTransfer = BigchainDB.Transaction
              .signTransaction(createTranfer, alice.privateKey)
              console.log(signedTransfer);

          conn.postTransactionCommit(signedTransfer)
          .then((val)=>{
            res.send(val);
          })
          .catch((err)=>{
            console.log(err);
            res.send(signedTransfer);
          })
          
      })
      .catch((err)=>{
        return (err);
      })
});


// function transferOwnership(txCreatedID, newOwner,alice) {
//   // Get transaction payload by ID
  

// }





const port = process.env.PORT || 5000;
/* Server config */
app.listen(port,()=>{
    console.log('express server started');
});
